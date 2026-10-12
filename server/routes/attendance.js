const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');

// Helper to extract authenticated user ID from request
const getAuthenticatedUserId = (req) => {
  let userId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;
  if (!userId && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer mc_jwt_token_')) {
      const tokenBody = authHeader.replace('Bearer mc_jwt_token_', '');
      const lastUnderscore = tokenBody.lastIndexOf('_');
      if (lastUnderscore > 0) {
        userId = tokenBody.substring(0, lastUnderscore);
      }
    }
  }
  return userId;
};

// ----------------------------------------------------
// 1. MESS OWNER: CREATE ATTENDANCE SESSION QR
// ----------------------------------------------------
router.post('/session/create', (req, res) => {
  try {
    const { messId, sessionType, expiryMinutes } = req.body;
    const userId = getAuthenticatedUserId(req);

    if (!messId) {
      return res.status(400).json({ success: false, message: 'Mess ID is required.' });
    }

    const mess = db.getMessById(messId);
    if (!mess) {
      return res.status(404).json({ success: false, message: 'Mess not found.' });
    }

    // Verify owner authorization if user ID provided
    if (userId) {
      const user = db.getUserById(userId);
      if (user && user.role === 'OWNER' && user.messId && user.messId !== messId) {
        return res.status(403).json({ success: false, message: 'Unauthorized to generate QR for this mess.' });
      }
    }

    const validSessions = ['Breakfast', 'Lunch', 'Dinner'];
    const effectiveSessionType = validSessions.includes(sessionType) ? sessionType : 'Lunch';
    const durationMins = Math.max(1, Math.min(120, parseInt(expiryMinutes || 15, 10)));
    const todayStr = new Date().toISOString().split('T')[0];

    // Generate secure random cryptographic token
    const secureToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + durationMins * 60 * 1000).toISOString();

    const newSession = db.createAttendanceSession({
      messId: mess.id,
      messName: mess.name,
      sessionType: effectiveSessionType,
      date: todayStr,
      token: secureToken,
      expiresAt,
      createdById: userId || mess.ownerId || null
    });

    const qrPayload = JSON.stringify({
      protocol: 'MESSCONNECT_ATTENDANCE_V1',
      messId: mess.id,
      messName: mess.name,
      sessionId: newSession.id,
      token: secureToken,
      sessionType: effectiveSessionType,
      date: todayStr,
      expiresAt
    });

    res.json({
      success: true,
      message: `${effectiveSessionType} Attendance QR generated successfully. Valid for ${durationMins} minutes.`,
      session: {
        ...newSession,
        qrPayload,
        durationMinutes: durationMins
      }
    });
  } catch (err) {
    console.error('[Attendance] Error creating session:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to generate attendance QR' });
  }
});

// ----------------------------------------------------
// 2. FETCH CURRENT ACTIVE ATTENDANCE SESSION
// ----------------------------------------------------
router.get('/session/active', (req, res) => {
  try {
    const { messId, sessionType, date } = req.query;
    if (!messId) {
      return res.status(400).json({ success: false, message: 'Mess ID is required.' });
    }

    const session = db.getActiveAttendanceSession(messId, sessionType, date);
    if (!session) {
      return res.json({ success: true, active: false, session: null });
    }

    const remainingMs = Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
    const remainingSeconds = Math.floor(remainingMs / 1000);

    const qrPayload = JSON.stringify({
      protocol: 'MESSCONNECT_ATTENDANCE_V1',
      messId: session.messId,
      messName: session.messName,
      sessionId: session.id,
      token: session.token,
      sessionType: session.sessionType,
      date: session.date,
      expiresAt: session.expiresAt
    });

    res.json({
      success: true,
      active: true,
      session: {
        ...session,
        remainingSeconds,
        qrPayload
      }
    });
  } catch (err) {
    console.error('[Attendance] Error fetching active session:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch active session' });
  }
});

// ----------------------------------------------------
// 3. MESS OWNER: CLOSE ATTENDANCE SESSION EARLY
// ----------------------------------------------------
router.post('/session/close', (req, res) => {
  try {
    const { sessionId, messId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const closed = db.closeAttendanceSession(sessionId);
    if (!closed) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    res.json({
      success: true,
      message: 'Attendance session successfully closed. All unmarked students marked as absent.',
      session: closed
    });
  } catch (err) {
    console.error('[Attendance] Error closing session:', err);
    res.status(500).json({ success: false, message: 'Failed to close session' });
  }
});

// ----------------------------------------------------
// 4. STUDENT: SCAN QR & MARK ATTENDANCE
// ----------------------------------------------------
router.post('/mark', (req, res) => {
  try {
    const { token, messId, sessionId, rawPayload } = req.body;
    const userId = getAuthenticatedUserId(req);

    // 1. Verify student authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Please log in to your student account to mark attendance.'
      });
    }

    const student = db.getUserById(userId);
    if (!student) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Student account not found.'
      });
    }

    // Parse payload if provided as raw scanned JSON string
    let parsedToken = token;
    let parsedMessId = messId;
    let parsedSessionId = sessionId;

    if (rawPayload && typeof rawPayload === 'string') {
      try {
        const parsed = JSON.parse(rawPayload);
        if (parsed.token) parsedToken = parsed.token;
        if (parsed.messId) parsedMessId = parsed.messId;
        if (parsed.sessionId) parsedSessionId = parsed.sessionId;
      } catch (e) {
        // Raw payload might be just the token string directly
        if (!parsedToken) parsedToken = rawPayload.trim();
      }
    }

    if (!parsedToken) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_TOKEN',
        message: 'Invalid QR code. No attendance token detected.'
      });
    }

    let session = null;
    const now = new Date();

    // Check if scanned token/payload is a Permanent Lifetime Mess Standee QR
    const isLifetime = (
      (parsedToken && (parsedToken.startsWith('MESS_LIFETIME:') || parsedToken.startsWith('MESSCONNECT_PERMANENT:'))) ||
      (rawPayload && (rawPayload.includes('MESSCONNECT_LIFETIME_V1') || rawPayload.includes('MESS_LIFETIME:')))
    );

    if (isLifetime) {
      let targetMessId = parsedMessId;
      if (!targetMessId && parsedToken.startsWith('MESS_LIFETIME:')) {
        targetMessId = parsedToken.replace('MESS_LIFETIME:', '').trim();
      } else if (!targetMessId && parsedToken.startsWith('MESSCONNECT_PERMANENT:')) {
        targetMessId = parsedToken.replace('MESSCONNECT_PERMANENT:', '').trim();
      }

      if (!targetMessId) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_LIFETIME_QR',
          message: 'Invalid lifetime mess QR code.'
        });
      }

      const targetMess = db.getMessById(targetMessId);
      if (!targetMess) {
        return res.status(404).json({
          success: false,
          code: 'MESS_NOT_FOUND',
          message: 'Target mess kitchen not found.'
        });
      }

      // Auto-determine meal session by current server clock time
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const totalMinutes = currentHours * 60 + currentMinutes;

      let effectiveSessionType = 'Lunch';
      // Breakfast: 07:00 (420) to 11:00 (660)
      // Lunch: 11:30 (690) to 16:00 (960)
      // Dinner: 19:00 (1140) to 23:00 (1380)
      if (totalMinutes >= 420 && totalMinutes <= 660) {
        effectiveSessionType = 'Breakfast';
      } else if (totalMinutes >= 690 && totalMinutes <= 960) {
        effectiveSessionType = 'Lunch';
      } else if (totalMinutes >= 1140 && totalMinutes <= 1380) {
        effectiveSessionType = 'Dinner';
      } else {
        const nextSession = totalMinutes < 420 ? 'Breakfast (starts 07:30 AM)' : (totalMinutes < 690 ? 'Lunch (starts 12:00 PM)' : (totalMinutes < 1140 ? 'Dinner (starts 07:30 PM)' : 'Breakfast tomorrow'));
        return res.status(400).json({
          success: false,
          code: 'OUTSIDE_MEAL_HOURS',
          message: `Kitchen is closed right now. Serving hours are Breakfast (07:30 - 10:30), Lunch (12:00 - 03:30), and Dinner (07:30 - 10:30). Next meal: ${nextSession}.`
        });
      }

      const todayStr = now.toISOString().split('T')[0];
      session = db.getActiveAttendanceSession(targetMess.id, effectiveSessionType, todayStr);
      if (!session) {
        session = db.createAttendanceSession({
          messId: targetMess.id,
          messName: targetMess.name,
          sessionType: effectiveSessionType,
          date: todayStr,
          token: `LIFETIME_${targetMess.id}_${todayStr}_${effectiveSessionType}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdById: targetMess.ownerId || null
        });
      }
    } else {
      // 2. Validate attendance session by regular dynamic token
      session = db.getAttendanceSessionByToken(parsedToken) || (parsedSessionId ? db.getAttendanceSessionById(parsedSessionId) : null);
      if (!session) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired QR code.'
        });
      }

      // 3. Verify token has not expired
      if (new Date(session.expiresAt) <= now || session.status !== 'ACTIVE') {
        if (session.status === 'ACTIVE') {
          session.status = 'EXPIRED';
          db.autoMarkAbsentForSession(session);
        }
        return res.status(400).json({
          success: false,
          code: 'EXPIRED_TOKEN',
          message: 'Invalid or expired QR code.'
        });
      }
    }

    // 4. Verify QR belongs to requested mess if messId was specified
    if (parsedMessId && session.messId !== parsedMessId) {
      return res.status(400).json({
        success: false,
        code: 'MESS_MISMATCH',
        message: 'This attendance QR code belongs to a different mess.'
      });
    }

    // 5. Verify the student belongs to/subscribed to this mess
    const userSubs = db.getUserSubscriptions(userId);
    const activeSub = userSubs.find(s => s.messId === session.messId && (s.status === 'ACTIVE' || s.status === 'PAUSED'));

    if (!activeSub) {
      return res.status(403).json({
        success: false,
        code: 'NOT_SUBSCRIBED',
        message: `You are not subscribed to ${session.messName || 'this mess'}. Only joined students can mark attendance.`
      });
    }

    if (activeSub.status === 'PAUSED') {
      return res.status(400).json({
        success: false,
        code: 'SUBSCRIPTION_PAUSED',
        message: 'Your subscription is currently paused on leave. Resume your plan to mark attendance.'
      });
    }

    // 6. Verify student has not already marked attendance for this session
    const existingRecord = db.findAttendanceRecord({
      studentId: userId,
      messId: session.messId,
      attendanceDate: session.date,
      sessionType: session.sessionType
    });

    if (existingRecord && existingRecord.status === 'PRESENT') {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_MARKED',
        message: 'Attendance already marked for this session.',
        record: existingRecord
      });
    }

    // Phase 2: Check session time window if enforceSessionTiming is enabled
    const settings = db.getAttendanceSettings(session.messId);
    if (settings && settings.enforceSessionTiming) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const parseTimeToMins = (tStr) => {
        if (!tStr) return 0;
        const [h, m] = tStr.split(':').map(Number);
        return h * 60 + m;
      };
      let windowStart = 0;
      let windowEnd = 24 * 60;
      if (session.sessionType === 'Breakfast') {
        windowStart = parseTimeToMins(settings.breakfastStart || '07:30');
        windowEnd = parseTimeToMins(settings.breakfastEnd || '10:30');
      } else if (session.sessionType === 'Lunch') {
        windowStart = parseTimeToMins(settings.lunchStart || '12:00');
        windowEnd = parseTimeToMins(settings.lunchEnd || '15:30');
      } else if (session.sessionType === 'Dinner') {
        windowStart = parseTimeToMins(settings.dinnerStart || '19:30');
        windowEnd = parseTimeToMins(settings.dinnerEnd || '22:30');
      }

      if (currentMinutes < windowStart || currentMinutes > windowEnd) {
        db.logAttendanceAudit({
          messId: session.messId,
          action: 'ATTENDANCE_REJECTED',
          studentId: student.id,
          studentName: student.name,
          sessionType: session.sessionType,
          attendanceDate: session.date,
          performedBy: student.name,
          role: 'STUDENT',
          reason: 'SESSION_WINDOW_CLOSED',
          details: { currentMinutes, windowStart, windowEnd }
        });
        return res.status(400).json({
          success: false,
          code: 'SESSION_WINDOW_CLOSED',
          message: `Attendance session is closed. Active window for ${session.sessionType} is ${session.sessionType === 'Breakfast' ? settings.breakfastStart + ' - ' + settings.breakfastEnd : session.sessionType === 'Lunch' ? settings.lunchStart + ' - ' + settings.lunchEnd : settings.dinnerStart + ' - ' + settings.dinnerEnd}.`
        });
      }
    }

    // Phase 2: Check Geofencing / Location Validation if enabled
    const { latitude, longitude } = req.body;
    let locationStatus = 'LOCATION_NOT_REQUIRED';

    if (settings && settings.locationVerificationEnabled) {
      const mess = db.getMessById(session.messId);
      const messLat = mess?.coordinates?.lat || mess?.lat;
      const messLng = mess?.coordinates?.lng || mess?.lng;

      if (messLat && messLng) {
        if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
          db.logAttendanceAudit({
            messId: session.messId,
            action: 'ATTENDANCE_REJECTED',
            studentId: student.id,
            studentName: student.name,
            sessionType: session.sessionType,
            attendanceDate: session.date,
            performedBy: student.name,
            role: 'STUDENT',
            reason: 'LOCATION_REQUIRED',
            locationStatus: 'MISSING_COORDINATES'
          });
          return res.status(400).json({
            success: false,
            code: 'LOCATION_REQUIRED',
            message: 'Location verification is required by this mess. Please allow device location access to mark attendance.'
          });
        }

        const distanceMeters = db.calculateHaversineDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(messLat),
          parseFloat(messLng)
        );

        const allowedRadius = settings.allowedRadiusMeters || 150;
        if (distanceMeters > allowedRadius) {
          db.logAttendanceAudit({
            messId: session.messId,
            action: 'ATTENDANCE_REJECTED',
            studentId: student.id,
            studentName: student.name,
            sessionType: session.sessionType,
            attendanceDate: session.date,
            performedBy: student.name,
            role: 'STUDENT',
            reason: 'LOCATION_OUT_OF_RANGE',
            locationStatus: `DISTANCE_${distanceMeters}M_EXCEEDED_${allowedRadius}M`
          });
          return res.status(400).json({
            success: false,
            code: 'LOCATION_OUT_OF_RANGE',
            message: `Location verification failed. You are ${distanceMeters}m away from the mess (allowed radius: ${allowedRadius}m).`
          });
        }

        locationStatus = `VERIFIED_${distanceMeters}M_WITHIN_${allowedRadius}M`;
      }
    }

    // 7. Create attendance record
    const formattedTime = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    const result = db.markAttendance({
      studentId: student.id,
      studentName: student.name || 'Student',
      messId: session.messId,
      messName: session.messName,
      sessionId: session.id,
      attendanceDate: session.date,
      sessionType: session.sessionType,
      status: 'PRESENT',
      markedAt: formattedTime
    });

    // Phase 2: Log Audit Entry
    db.logAttendanceAudit({
      messId: session.messId,
      action: 'ATTENDANCE_MARKED',
      studentId: student.id,
      studentName: student.name,
      sessionType: session.sessionType,
      attendanceDate: session.date,
      performedBy: student.name,
      role: 'STUDENT',
      locationStatus,
      details: { time: formattedTime, method: 'QR_SCAN' }
    });

    // Send in-app notification to student
    try {
      db.createNotification({
        userId: student.id,
        title: 'Attendance Marked ✅',
        message: `Your attendance for ${session.sessionType} at ${session.messName} has been marked successfully.`,
        type: 'ATTENDANCE'
      });
    } catch (e) {
      console.warn('[Attendance] Student notification failed:', e.message);
    }

    // Send real-time meal check-in alert to Mess Owner
    const currentMess = db.getMessById(session.messId);
    if (currentMess && currentMess.ownerId) {
      try {
        db.createNotification({
          userId: currentMess.ownerId,
          title: `Student Check-In: ${student.name} 🍽️`,
          message: `${student.name} just marked attendance for ${session.sessionType} at ${formattedTime}.`,
          type: 'ATTENDANCE_CHECKIN'
        });
      } catch (e) {
        console.warn('[Attendance] Owner notification failed:', e.message);
      }
    }

    res.json({
      success: true,
      message: 'Attendance Marked Successfully!',
      record: {
        messName: session.messName,
        sessionType: session.sessionType,
        date: session.date,
        time: formattedTime,
        status: 'PRESENT',
        studentName: student.name,
        studentId: student.id,
        locationStatus
      }
    });
  } catch (err) {
    console.error('[Attendance] Error marking attendance:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to mark attendance' });
  }
});

// ----------------------------------------------------
// 5. STUDENT ATTENDANCE DASHBOARD & HISTORY
// ----------------------------------------------------
router.get('/student', (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { messId, timeframe } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please sign in to view student attendance.' });
    }

    const summary = db.getStudentAttendanceSummary(userId, messId, timeframe || 'all');
    res.json({
      success: true,
      ...summary
    });
  } catch (err) {
    console.error('[Attendance] Error fetching student attendance:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch student attendance data' });
  }
});

// ----------------------------------------------------
// 6. MESS OWNER ATTENDANCE ROSTER (TABLE WITH FILTERS & SEARCH)
// ----------------------------------------------------
router.get('/owner/roster', (req, res) => {
  try {
    const { messId, date, sessionType, status, search } = req.query;
    if (!messId) {
      return res.status(400).json({ success: false, message: 'Mess ID is required.' });
    }

    const roster = db.getMessAttendanceRoster({
      messId,
      date,
      sessionType,
      status,
      search
    });

    res.json({
      success: true,
      ...roster
    });
  } catch (err) {
    console.error('[Attendance] Error fetching owner roster:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance roster' });
  }
});

// ----------------------------------------------------
// 7. MESS OWNER ATTENDANCE ANALYTICS
// ----------------------------------------------------
router.get('/owner/analytics', (req, res) => {
  try {
    const { messId } = req.query;
    if (!messId) {
      return res.status(400).json({ success: false, message: 'Mess ID is required.' });
    }

    const analytics = db.getMessAttendanceAnalytics(messId);
    res.json({
      success: true,
      ...analytics
    });
  } catch (err) {
    console.error('[Attendance] Error fetching owner analytics:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance analytics' });
  }
});

// ----------------------------------------------------
// 8. REAL-TIME LIVE SUMMARY FOR OWNER DASHBOARD POLLING
// ----------------------------------------------------
router.get('/owner/live-summary', (req, res) => {
  try {
    const { messId, sessionType, date } = req.query;
    if (!messId) {
      return res.status(400).json({ success: false, message: 'Mess ID is required.' });
    }

    const todayStr = date || new Date().toISOString().split('T')[0];
    const activeSession = db.getActiveAttendanceSession(messId, sessionType, todayStr);
    const targetSession = sessionType || (activeSession ? activeSession.sessionType : 'Lunch');

    const roster = db.getMessAttendanceRoster({
      messId,
      date: todayStr,
      sessionType: targetSession
    });

    const recentScans = (db.data.attendance || [])
      .filter(r => r.messId === messId && r.attendanceDate === todayStr && r.status === 'PRESENT')
      .slice(0, 5)
      .map(r => ({
        studentName: r.studentName,
        sessionType: r.sessionType,
        time: r.markedAt
      }));

    res.json({
      success: true,
      timestamp: Date.now(),
      activeSession: activeSession ? {
        id: activeSession.id,
        sessionType: activeSession.sessionType,
        expiresAt: activeSession.expiresAt,
        remainingSeconds: Math.max(0, Math.floor((new Date(activeSession.expiresAt).getTime() - Date.now()) / 1000))
      } : null,
      totalStudents: roster.totalStudents,
      presentCount: roster.presentCount,
      absentCount: roster.absentCount,
      attendancePercentage: roster.attendancePercentage,
      recentScans
    });
  } catch (err) {
    console.error('[Attendance] Error fetching live summary:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch live summary' });
  }
});

// ----------------------------------------------------
// 9. PHASE 2: ATTENDANCE SETTINGS
// ----------------------------------------------------
router.get('/settings', (req, res) => {
  try {
    const { messId } = req.query;
    if (!messId) {
      return res.status(400).json({ success: false, message: 'Mess ID is required.' });
    }
    const settings = db.getAttendanceSettings(messId);
    res.json({ success: true, settings });
  } catch (err) {
    console.error('[Attendance] Error getting settings:', err);
    res.status(500).json({ success: false, message: 'Failed to get attendance settings' });
  }
});

router.put('/settings', (req, res) => {
  try {
    const { messId, updates } = req.body;
    const userId = getAuthenticatedUserId(req);
    if (!messId) {
      return res.status(400).json({ success: false, message: 'Mess ID is required.' });
    }

    const updated = db.updateAttendanceSettings(messId, updates || {});
    db.logAttendanceAudit({
      messId,
      action: 'SETTINGS_UPDATED',
      performedBy: userId || 'OWNER',
      role: 'OWNER',
      details: updates
    });

    res.json({ success: true, message: 'Attendance settings updated successfully.', settings: updated });
  } catch (err) {
    console.error('[Attendance] Error updating settings:', err);
    res.status(500).json({ success: false, message: 'Failed to update attendance settings' });
  }
});

// ----------------------------------------------------
// 10. PHASE 2: ROTATE QR TOKEN FOR ACTIVE SESSION
// ----------------------------------------------------
router.post('/owner/rotate-qr', (req, res) => {
  try {
    const { messId, sessionType, date } = req.body;
    if (!messId) {
      return res.status(400).json({ success: false, message: 'Mess ID is required.' });
    }

    const session = db.rotateActiveSessionToken(messId, sessionType, date);
    if (!session) {
      return res.status(404).json({ success: false, message: 'No active session found to rotate.' });
    }

    const remainingMs = Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
    const remainingSeconds = Math.floor(remainingMs / 1000);

    const qrPayload = JSON.stringify({
      protocol: 'MESSCONNECT_ATTENDANCE_V1',
      messId: session.messId,
      messName: session.messName,
      sessionId: session.id,
      token: session.token,
      sessionType: session.sessionType,
      date: session.date,
      expiresAt: session.expiresAt
    });

    res.json({
      success: true,
      message: 'QR Code rotated successfully with a new secure token.',
      session: {
        ...session,
        remainingSeconds,
        qrPayload
      }
    });
  } catch (err) {
    console.error('[Attendance] Error rotating QR:', err);
    res.status(500).json({ success: false, message: 'Failed to rotate QR code' });
  }
});

// ----------------------------------------------------
// 11. PHASE 2: MANUAL ATTENDANCE CORRECTION
// ----------------------------------------------------
router.post('/owner/correct', (req, res) => {
  try {
    const { messId, studentId, date, sessionType, status, reason } = req.body;
    const userId = getAuthenticatedUserId(req);

    if (!messId || !studentId) {
      return res.status(400).json({ success: false, message: 'Mess ID and Student ID are required.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Mandatory reason is required for manual correction.' });
    }
    if (!['PRESENT', 'ABSENT'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be PRESENT or ABSENT.' });
    }

    const user = userId ? db.getUserById(userId) : null;
    const ownerName = user ? user.name : 'Mess Owner';

    const result = db.manualCorrectAttendance({
      messOwnerId: userId,
      messOwnerName: ownerName,
      messId,
      studentId,
      date,
      sessionType: sessionType || 'Lunch',
      newStatus: status,
      reason: reason.trim()
    });

    res.json({
      success: true,
      message: `Attendance manually corrected to ${status}.`,
      ...result
    });
  } catch (err) {
    console.error('[Attendance] Error correcting attendance:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to correct attendance' });
  }
});

// ----------------------------------------------------
// 12. PHASE 2: STUDENT ATTENDANCE PROFILE
// ----------------------------------------------------
router.get('/owner/profile', (req, res) => {
  try {
    const { messId, studentId } = req.query;
    if (!messId || !studentId) {
      return res.status(400).json({ success: false, message: 'Mess ID and Student ID are required.' });
    }

    const profile = db.getStudentAttendanceProfile(studentId, messId);
    res.json({ success: true, profile });
  } catch (err) {
    console.error('[Attendance] Error getting student profile:', err);
    res.status(500).json({ success: false, message: 'Failed to get student attendance profile' });
  }
});

// ----------------------------------------------------
// 13. PHASE 2: ATTENDANCE AUDIT LOGS
// ----------------------------------------------------
router.get('/owner/audit-logs', (req, res) => {
  try {
    const { messId, action, studentId, sessionType, startDate, endDate } = req.query;
    if (!messId) {
      return res.status(400).json({ success: false, message: 'Mess ID is required.' });
    }

    const logs = db.getAttendanceAuditLogs(messId, {
      action,
      studentId,
      sessionType,
      startDate,
      endDate
    });

    res.json({ success: true, logs });
  } catch (err) {
    console.error('[Attendance] Error getting audit logs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance audit logs' });
  }
});

// ----------------------------------------------------
// 14. PHASE 2: ATTENDANCE REPORTS & CSV EXPORT
// ----------------------------------------------------
router.get('/owner/reports', (req, res) => {
  try {
    const { messId, startDate, endDate, sessionType } = req.query;
    if (!messId) {
      return res.status(400).json({ success: false, message: 'Mess ID is required.' });
    }

    const reports = db.getMessAttendanceReports(messId, {
      startDate,
      endDate,
      sessionType
    });

    res.json({ success: true, ...reports });
  } catch (err) {
    console.error('[Attendance] Error getting reports:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance reports' });
  }
});

// ----------------------------------------------------
// 15. PHASE 2: SEND LOW ATTENDANCE WARNING
// ----------------------------------------------------
router.post('/owner/send-warning', (req, res) => {
  try {
    const { messId, studentId, percentage, threshold } = req.body;
    const userId = getAuthenticatedUserId(req);

    if (!messId || !studentId) {
      return res.status(400).json({ success: false, message: 'Mess ID and Student ID are required.' });
    }

    const mess = db.getMessById(messId);
    const messName = mess ? mess.name : 'Mess';

    db.createNotification({
      userId: studentId,
      title: '⚠️ Low Attendance Notice',
      message: `Your current attendance at ${messName} is ${percentage}%, which is below the recommended ${threshold || 75}%. Please attend regularly to maintain your meal subscription benefits.`,
      type: 'ATTENDANCE_WARNING'
    });

    db.logAttendanceAudit({
      messId,
      action: 'WARNING_SENT',
      studentId,
      performedBy: userId || 'OWNER',
      role: 'OWNER',
      reason: `Low attendance warning sent (${percentage}% < ${threshold || 75}%)`
    });

    res.json({ success: true, message: 'Low attendance warning notice sent to student.' });
  } catch (err) {
    console.error('[Attendance] Error sending warning:', err);
    res.status(500).json({ success: false, message: 'Failed to send attendance warning' });
  }
});

module.exports = router;
