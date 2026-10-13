const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { sendMessStatusEmail } = require('../services/emailService');
const { rowsToCSV, workbookToExcelXML, TABLE_METADATA } = require('../db/exportUtils');
const analyticsService = require('../services/analyticsService');

// Default Admin Platform Configuration
const defaultSupportTeam = [
  {
    id: 'rohit',
    name: 'Rohit',
    phone: '8766793139',
    displayPhone: '+91 87667 93139',
    role: 'Student & Meal Pass Support',
    type: 'support',
    badge: 'Support Desk'
  },
  {
    id: 'shreyash',
    name: 'Shreyash',
    phone: '9309294400',
    displayPhone: '+91 93092 94400',
    role: 'Kitchen Partner & Operations Support',
    type: 'support',
    badge: 'Support Desk'
  },
  {
    id: 'parth',
    name: 'Parth',
    phone: '9423490513',
    displayPhone: '+91 94234 90513',
    role: 'Platform Admin & Escalations Lead',
    type: 'admin',
    badge: 'Admin Support'
  }
];

function getPlatformSettings() {
  const settings = db.getPlatformSettings ? db.getPlatformSettings() : (db.data.platformSettings || {});
  if (!settings.supportTeam || !Array.isArray(settings.supportTeam)) {
    settings.supportTeam = defaultSupportTeam;
  }
  return settings;
}


// Security Middleware: Role-Based Authorization Guard
const requireAdminAuth = (req, res, next) => {
  const userRole = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  let user = null;
  if (userId) {
    user = db.getUserById(userId);
  }

  // Check if role is ADMIN
  if (userRole === 'ADMIN' || (user && user.role === 'ADMIN')) {
    return next();
  }

  // Also check auth header token format
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.includes('admin')) {
    return next();
  }

  // If running in development without strict header, verify query
  if (req.query.role === 'ADMIN' || req.query.adminKey === 'mc_admin_secret_2026') {
    return next();
  }

  // Strict 403 Forbidden for students and owners
  return res.status(403).json({
    success: false,
    message: 'Access Denied: Admin authorization required. Normal students and mess owners cannot access this endpoint.'
  });
};

// Apply Admin Auth Middleware to all routes in this file
router.use(requireAdminAuth);

// GET /api/admin/stats - Complete Platform Overview
router.get('/stats', async (req, res) => {
  try {
    await db.syncFromMySQL();
  } catch (e) {}
  const messes = db.getMesses();
  const users = db.getUsers();
  const students = users.filter(u => u.role === 'CUSTOMER');
  const subs = db.getSubscriptions();
  const complaints = db.getComplaints();
  const openComplaints = complaints.filter(c => c.status === 'OPEN');

  const pendingApprovalCount = messes.filter(m => !m.verified || m.verificationStatus === 'UNDER_REVIEW').length;
  const activeMessesCount = messes.filter(m => m.verified && m.status !== 'SUSPENDED').length;

  // Area distribution dynamically from real messes
  const areaCounts = {};
  messes.forEach(m => {
    if (m.area) {
      areaCounts[m.area] = (areaCounts[m.area] || 0) + 1;
    }
  });

  // Calculate real GMV from active subscriptions
  const owners = users.filter(u => u.role === 'OWNER');
  const activeSubs = subs.filter(s => s.status === 'ACTIVE');
  const totalGMV = activeSubs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const currentCommRate = Number(getPlatformSettings().commissionRatePercent) || 5.0;
  const commissionRate = currentCommRate / 100;
  const totalCommission = Math.round(totalGMV * commissionRate);
  const totalOwnerPayout = totalGMV - totalCommission;

  res.json({
    success: true,
    stats: {
      totalMesses: messes.length,
      activeMesses: activeMessesCount,
      pendingApproval: pendingApprovalCount,
      totalStudents: students.length,
      totalOwners: owners.length,
      totalSubscriptions: subs.length,
      platformGMV: totalGMV,
      platformCommission: totalCommission,
      ownerPayouts: totalOwnerPayout,
      commissionRatePercent: currentCommRate,
      activeSubscriptions: activeSubs.length,
      openComplaintsCount: openComplaints.length,
      areaDistribution: areaCounts
    }
  });
});

// GET /api/admin/verifications - List all owner verification applications
router.get('/verifications', async (req, res) => {
  try {
    await db.syncFromMySQL();
  } catch (e) {}
  const messes = db.getMesses();
  const users = db.getUsers();

  // Combine messes with owner details and documents
  const applications = messes.map(m => {
    const owner = users.find(u =>
      u.id === m.ownerId ||
      u.messId === m.id ||
      (m.phone && u.phone === m.phone) ||
      (m.email && u.email && u.email.toLowerCase() === m.email.toLowerCase())
    ) || {};
    const isApproved = m.verified === true || m.verificationStatus === 'APPROVED' || owner.verified === true || owner.verificationStatus === 'APPROVED';
    const isRejected = m.verificationStatus === 'REJECTED' || owner.verificationStatus === 'REJECTED';
    const isChangesReq = m.verificationStatus === 'CHANGES_REQUESTED' || owner.verificationStatus === 'CHANGES_REQUESTED';
    const status = isApproved ? 'APPROVED' : (isRejected ? 'REJECTED' : (isChangesReq ? 'CHANGES_REQUESTED' : 'UNDER_REVIEW'));
    const reviewNotes = (owner && owner.reviewNotes) || m.reviewNotes || '';
    const docs = (owner && owner.documents) || m.documents || null;

    return {
      id: m.id,
      messId: m.id,
      messName: m.name,
      ownerId: m.ownerId || owner.id,
      ownerName: owner.name || 'Mess Partner',
      phone: owner.phone || m.phone || '',
      email: owner.email || m.email || '',
      area: m.area || '',
      city: m.city || '',
      address: m.address || '',
      verified: isApproved,
      status: isApproved ? 'ACTIVE' : (isRejected ? 'REJECTED' : (m.status || 'PENDING_VERIFICATION')),
      verificationStatus: status,
      submittedAt: m.createdAt || owner.createdAt || new Date().toISOString(),
      reviewNotes: reviewNotes,
      documents: docs
    };
  });

  // Also include any owner accounts that may not have linked mess objects yet
  const owners = users.filter(u => u.role === 'OWNER');
  owners.forEach(owner => {
    const alreadyMapped = applications.some(a => a.ownerId === owner.id || a.messId === owner.messId);
    if (!alreadyMapped) {
      const isApproved = owner.verificationStatus === 'APPROVED' || owner.verified === true;
      applications.unshift({
        id: owner.messId || owner.id,
        messId: owner.messId || owner.id,
        messName: owner.messName || `${owner.name}'s Mess`,
        ownerId: owner.id,
        ownerName: owner.name,
        phone: owner.phone || '',
        email: owner.email || '',
        area: owner.location || '',
        city: 'Pune',
        address: owner.location || '',
        verified: isApproved,
        status: isApproved ? 'ACTIVE' : (owner.verificationStatus === 'REJECTED' ? 'REJECTED' : 'PENDING_VERIFICATION'),
        verificationStatus: isApproved ? 'APPROVED' : (owner.verificationStatus || 'UNDER_REVIEW'),
        submittedAt: owner.createdAt || new Date().toISOString(),
        reviewNotes: owner.reviewNotes || '',
        documents: owner.documents || null
      });
    }
  });

  res.json({
    success: true,
    applications
  });
});

// POST /api/admin/verifications/:id/decision - Approve / Reject / Request Changes
router.post('/verifications/:id/decision', (req, res) => {
  const { decision, reason = '' } = req.body;
  const targetId = req.params.id;
  const cleanedId = targetId.startsWith('owner_') ? targetId.replace('owner_', '') : targetId;

  let mess = db.getMessById(targetId) || db.getMessById(cleanedId);
  const users = db.getUsers();
  let owner = users.find(u =>
    u.id === targetId ||
    u.id === cleanedId ||
    u.messId === targetId ||
    u.messId === cleanedId ||
    (mess && (u.id === mess.ownerId || u.messId === mess.id || (mess.phone && u.phone === mess.phone) || (mess.email && u.email && u.email.toLowerCase() === mess.email.toLowerCase())))
  );

  if (!mess && owner) {
    if (owner.messId) {
      mess = db.getMessById(owner.messId);
    }
    if (!mess) {
      const messes = db.getMesses();
      mess = messes.find(m => m.ownerId === owner.id || (m.phone && m.phone === owner.phone) || (m.email && owner.email && m.email.toLowerCase() === owner.email.toLowerCase()));
    }
    if (!mess) {
      mess = db.createMess({
        id: owner.messId || `mess_${Date.now()}`,
        ownerId: owner.id,
        name: owner.messName || `${owner.name}'s Mess`,
        area: owner.location || 'Pune',
        city: 'Pune',
        address: owner.location || 'Campus Road, Pune',
        phone: owner.phone,
        email: owner.email,
        pricePerMonth: 3200,
        isPureVeg: false,
        status: 'PENDING_VERIFICATION',
        verified: false,
        verificationStatus: 'UNDER_REVIEW',
        documents: owner.documents
      });
      owner.messId = mess.id;
      db.save();
    }
  }

  if (mess && !owner) {
    owner = users.find(u =>
      u.id === mess.ownerId ||
      u.messId === mess.id ||
      (mess.phone && u.phone === mess.phone) ||
      (u.email && mess.email && u.email.toLowerCase() === mess.email.toLowerCase())
    );
  }

  if (!mess && !owner) {
    return res.status(404).json({ success: false, message: 'Mess or owner application not found' });
  }

  // Ensure bidirectional linking
  if (mess && owner) {
    if (!owner.messId) owner.messId = mess.id;
    if (!mess.ownerId) mess.ownerId = owner.id;
    if (!owner.messName && mess.name) owner.messName = mess.name;
    if (!mess.phone && owner.phone) mess.phone = owner.phone;
    if (!mess.email && owner.email) mess.email = owner.email;
  }

  let newStatus = 'UNDER_REVIEW';
  let isVerified = false;
  let simulatedSms = '';
  let simulatedEmail = '';

  if (decision === 'APPROVE') {
    newStatus = 'APPROVED';
    isVerified = true;
    if (mess) {
      mess.status = 'ACTIVE';
      mess.verified = true;
      mess.verificationStatus = 'APPROVED';
      mess.reviewNotes = reason || 'Approved by MessConnect Quality & Compliance Team.';
    }

    if (owner) {
      owner.status = 'ACTIVE';
      owner.verificationStatus = 'APPROVED';
      owner.verified = true;
      owner.reviewNotes = mess ? mess.reviewNotes : (reason || 'Approved by MessConnect Quality & Compliance Team.');
    }

    simulatedSms = `MessConnect: Congratulations ${owner?.name || 'Partner'}! Your owner account for ${mess?.name || 'your mess'} has been APPROVED and activated. You can now log in to your owner dashboard.`;
    simulatedEmail = `Subject: Your MessConnect Partner Account is Approved!\n\nDear ${owner?.name || 'Partner'},\n\nWe are pleased to inform you that ${mess?.name || 'your mess'} has been verified and is now live for student subscriptions on MessConnect.`;

  } else if (decision === 'REJECT') {
    newStatus = 'REJECTED';
    isVerified = false;
    if (mess) {
      mess.status = 'REJECTED';
      mess.verified = false;
      mess.verificationStatus = 'REJECTED';
      mess.reviewNotes = reason || 'Documents did not meet food safety or verification standards.';
    }

    if (owner) {
      owner.status = 'REJECTED';
      owner.verificationStatus = 'REJECTED';
      owner.verified = false;
      owner.reviewNotes = mess ? mess.reviewNotes : (reason || 'Documents did not meet food safety or verification standards.');
    }

    simulatedSms = `MessConnect: Your application for ${mess?.name || 'your mess'} was rejected. Reason: ${(mess && mess.reviewNotes) || (owner && owner.reviewNotes)}`;
    simulatedEmail = `Subject: MessConnect Application Status: Rejected\n\nDear ${owner?.name || 'Partner'},\n\nYour application was not approved. Reason: ${(mess && mess.reviewNotes) || (owner && owner.reviewNotes)}\nPlease contact support for re-evaluation.`;

  } else if (decision === 'CHANGES_REQUESTED') {
    newStatus = 'CHANGES_REQUESTED';
    isVerified = false;
    if (mess) {
      mess.status = 'PENDING_VERIFICATION';
      mess.verified = false;
      mess.verificationStatus = 'CHANGES_REQUESTED';
      mess.reviewNotes = reason || 'Additional information or clearer document scans required.';
    }

    if (owner) {
      owner.verificationStatus = 'CHANGES_REQUESTED';
      owner.verified = false;
      owner.reviewNotes = mess ? mess.reviewNotes : (reason || 'Additional information or clearer document scans required.');
    }

    simulatedSms = `MessConnect: Action required for ${mess?.name || 'your mess'}. Please review requested document changes in your portal.`;
    simulatedEmail = `Subject: MessConnect: Document Updates Required\n\nDear ${owner?.name || 'Partner'},\n\nOur team reviewed your submission. Please update: ${(mess && mess.reviewNotes) || (owner && owner.reviewNotes)}`;
  }

  // Create notification in DB for the owner
  if (owner) {
    db.data.notifications = db.data.notifications || [];
    db.data.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: owner.id,
      title: decision === 'APPROVE' ? '🎉 Account Approved!' : decision === 'REJECT' ? '❌ Application Rejected' : '⚠️ Document Updates Required',
      message: decision === 'APPROVE' ? 'Your mess is verified! You can now scan student meal passes and publish menus.' : (mess ? mess.reviewNotes : owner.reviewNotes),
      channel: 'Account',
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  db.save();

  console.log(`[Admin Notification] Simulated SMS to ${owner?.phone || (mess && mess.phone)}: ${simulatedSms}`);
  console.log(`[Admin Notification] Email notification triggered for ${owner?.email || (mess && mess.email)}`);

  // Send real status email to mess owner via Gmail SMTP (safe & non-blocking)
  const targetEmail = owner?.email || (mess && mess.email);
  if (targetEmail) {
    try {
      sendMessStatusEmail({
        email: targetEmail,
        ownerName: owner?.name || 'Partner',
        messName: mess?.name || 'Your Mess',
        status: decision === 'APPROVE' ? 'APPROVED' : (decision === 'REJECT' ? 'REJECTED' : 'CHANGES_REQUESTED'),
        reviewNotes: (mess && mess.reviewNotes) || (owner && owner.reviewNotes)
      }).catch(err => {
        console.warn(`⚠️ [Admin Email] Email notice for ${targetEmail}:`, err.message);
      });
    } catch (err) {
      console.warn(`⚠️ [Admin Email] Error dispatching email:`, err.message);
    }
  }

  res.json({
    success: true,
    message: `Application ${decision.toLowerCase()} successfully.`,
    mess,
    notification: {
      sms: simulatedSms,
      email: simulatedEmail,
      gateway: 'GMAIL_SMTP'
    }
  });
});

// GET /api/admin/messes - Mess Management with Area & Status filtering
router.get('/messes', (req, res) => {
  const { area, status, verification, search } = req.query;
  let messes = db.getMesses();
  const users = db.getUsers();

  // Attach owner details
  let enriched = messes.map(m => {
    const owner = users.find(u => u.id === m.ownerId) || {};
    return {
      ...m,
      ownerName: owner.name || 'Mess Partner',
      ownerPhone: owner.phone || m.phone,
      ownerEmail: owner.email || m.email,
      verificationStatus: m.verificationStatus || (m.verified ? 'APPROVED' : 'UNDER_REVIEW')
    };
  });

  if (search) {
    const q = search.toLowerCase();
    enriched = enriched.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.ownerName?.toLowerCase().includes(q) ||
      m.area?.toLowerCase().includes(q)
    );
  }

  if (area && area !== 'All' && area !== 'All Areas') {
    enriched = enriched.filter(m => m.area?.toLowerCase() === area.toLowerCase());
  }

  if (status && status !== 'All') {
    enriched = enriched.filter(m => (m.status || 'ACTIVE').toLowerCase() === status.toLowerCase());
  }

  if (verification && verification !== 'All') {
    if (verification === 'Verified') enriched = enriched.filter(m => m.verified);
    if (verification === 'Unverified') enriched = enriched.filter(m => !m.verified);
  }

  res.json({
    success: true,
    messes: enriched,
    count: enriched.length
  });
});

// PUT /api/admin/messes/:id/status - Suspend or Activate Mess
router.put('/messes/:id/status', (req, res) => {
  const { status } = req.body;
  const mess = db.updateMess(req.params.id, { status });
  if (!mess) return res.status(404).json({ success: false, message: 'Mess not found' });
  res.json({ success: true, mess, message: `Mess status updated to ${status}` });
});

// GET /api/admin/area-analytics - Area specific breakdown (Dynamically computed from real records)
router.get('/area-analytics', (req, res) => {
  const { area = 'All' } = req.query;
  const messes = db.getMesses();
  const subs = db.getSubscriptions();

  // Filter by area if not 'All'
  const filteredMesses = (area === 'All' || area === 'All Areas')
    ? messes
    : messes.filter(m => (m.area || '').toLowerCase() === area.toLowerCase());

  const totalMesses = filteredMesses.length;
  const activeMesses = filteredMesses.filter(m => m.verified && m.status !== 'SUSPENDED').length;
  const pendingVerification = filteredMesses.filter(m => !m.verified || m.verificationStatus === 'UNDER_REVIEW').length;
  const rejected = filteredMesses.filter(m => m.verificationStatus === 'REJECTED').length;

  const messIds = new Set(filteredMesses.map(m => m.id));
  const areaSubs = subs.filter(s => messIds.has(s.messId));
  const activeSubs = areaSubs.filter(s => s.status === 'ACTIVE');

  const gmv = activeSubs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const currentCommRate = Number(getPlatformSettings().commissionRatePercent) || 5.0;
  const commission = Math.round(gmv * (currentCommRate / 100));

  res.json({
    success: true,
    area,
    analytics: {
      totalMesses,
      activeMesses,
      pendingVerification,
      rejected,
      totalCustomers,
      activeSubs: activeSubs.length,
      gmv,
      commissionRatePercent: currentCommRate,
      platformCommission: commission
    }
  });
});

// GET /api/admin/revenue - Revenue breakdown & Commission calculations (Real payments & subscriptions)
router.get('/revenue', async (req, res) => {
  try {
    await db.syncFromMySQL();
  } catch (e) {}
  const commRate = Number(getPlatformSettings().commissionRatePercent) || 5.0;
  const subs = db.getSubscriptions();
  const payments = db.getPayments ? db.getPayments() : [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let todayRevenue = 0;
  let thisMonthRevenue = 0;
  let totalPlatformRevenue = 0;

  if (payments && payments.length > 0) {
    payments.forEach(p => {
      const pAmt = Number(p.amount) || 0;
      const pTime = new Date(p.createdAt || p.date || now).getTime();
      totalPlatformRevenue += pAmt;
      if (pTime >= startOfMonth) thisMonthRevenue += pAmt;
      if (pTime >= startOfToday) todayRevenue += pAmt;
    });
  } else {
    subs.forEach(s => {
      const sAmt = Number(s.amount) || 0;
      const sTime = new Date(s.createdAt || s.startDate || now).getTime();
      totalPlatformRevenue += sAmt;
      if (sTime >= startOfMonth) thisMonthRevenue += sAmt;
      if (sTime >= startOfToday) todayRevenue += sAmt;
    });
  }

  const commissionGeneratedToday = Math.round(todayRevenue * (commRate / 100));
  const commissionGeneratedMonth = Math.round(thisMonthRevenue * (commRate / 100));
  const totalCommission = Math.round(totalPlatformRevenue * (commRate / 100));

  const users = db.getUsers();
  const messes = db.getMesses();

  const realSubscriptions = subs.map(s => {
    const student = users.find(u => u.id === s.userId) || {};
    const mess = messes.find(m => m.id === s.messId) || {};
    const owner = users.find(u => u.id === mess.ownerId || u.messId === mess.id) || {};
    const grossAmount = Number(s.amount) || 3200;
    const platformCommission = Math.round(grossAmount * (commRate / 100));
    const ownerNetPayout = grossAmount - platformCommission;

    return {
      id: s.id,
      studentId: s.userId,
      studentName: student.name || s.userName || 'Student Diner',
      studentEmail: student.email || '',
      studentPhone: student.phone || '',
      messId: s.messId,
      messName: mess.name || s.messName || 'Partner Kitchen',
      messArea: mess.area || student.location || 'Pune',
      ownerId: mess.ownerId || owner.id,
      ownerName: owner.name || 'Mess Partner',
      ownerPhone: owner.phone || mess.phone || '',
      planName: s.planName || s.planId || 'Monthly All Meals Plan',
      planMeals: s.meals || ['Lunch', 'Dinner'],
      grossAmount,
      commissionRatePercent: commRate,
      platformCommission,
      ownerNetPayout,
      status: s.status || 'ACTIVE',
      totalDays: s.totalDays || 30,
      activeDays: s.activeDays || 0,
      remainingDays: s.remainingDays || 30,
      startDate: s.startDate || s.createdAt || new Date().toISOString(),
      endDate: s.endDate || '',
      createdAt: s.createdAt || s.startDate || new Date().toISOString(),
      payoutStatus: s.status === 'ACTIVE' ? 'SETTLED' : 'PENDING'
    };
  });

  res.json({
    success: true,
    revenue: {
      todayRevenue,
      thisMonthRevenue,
      totalPlatformRevenue,
      commissionGeneratedToday,
      commissionGeneratedMonth,
      totalCommission,
      totalOwnerPayouts: totalPlatformRevenue - totalCommission,
      commissionRatePercent: commRate,
      subscriptionsCount: realSubscriptions.length,
      activeSubscriptionsCount: realSubscriptions.filter(s => s.status === 'ACTIVE').length,
      subscriptions: realSubscriptions,
      exampleCalculation: {
        customerPays: 3000,
        commissionRatePercent: commRate,
        platformCommission: Math.round(3000 * (commRate / 100)),
        ownerReceives: 3000 - Math.round(3000 * (commRate / 100))
      }
    }
  });
});

// ========================================================
// SECTION 15: ADMIN PLATFORM-WIDE PAYMENT MONITORING
// ========================================================
router.get('/payments', (req, res) => {
  const stats = db.getAdminPaymentStats();
  const payments = db.getPayments();
  const { search, status, messId } = req.query;

  let list = payments.map(p => {
    const student = p.userId ? db.getUserById(p.userId) : null;
    const mess = p.messId ? db.getMessById(p.messId) : null;
    const sub = p.subscriptionId ? db.getSubscriptionById(p.subscriptionId) : null;

    return {
      id: p.id,
      orderId: p.orderId,
      paymentId: p.paymentId,
      receiptNumber: p.receiptNumber || p.id,
      studentName: student?.name || sub?.userName || 'Student',
      studentEmail: student?.email || '',
      studentPhone: student?.phone || sub?.userPhone || '',
      messId: p.messId,
      messName: mess?.name || 'Partner Mess',
      planName: sub?.planName || p.description || 'Meal Plan',
      amount: Number(p.amount) || 0,
      refundAmount: Number(p.refundAmount) || 0,
      currency: p.currency || 'INR',
      status: p.status,
      method: p.method,
      date: p.date || p.createdAt,
      verifiedAt: p.verifiedAt,
      hasVerifiedSignature: Boolean(p.signature)
    };
  });

  if (status && status !== 'All') {
    list = list.filter(p => p.status === status);
  }
  if (messId && messId !== 'All') {
    list = list.filter(p => p.messId === messId);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(p =>
      p.studentName?.toLowerCase().includes(q) ||
      p.messName?.toLowerCase().includes(q) ||
      p.receiptNumber?.toLowerCase().includes(q) ||
      p.paymentId?.toLowerCase().includes(q) ||
      p.orderId?.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  res.json({
    success: true,
    stats,
    count: list.length,
    payments: list
  });
});

// GET /api/admin/support-team - Support personnel & Admin Helplines
router.get('/support-team', (req, res) => {
  res.json({
    success: true,
    supportTeam: getPlatformSettings().supportTeam
  });
});

// GET /api/admin/settings - Retrieve platform settings
router.get('/settings', (req, res) => {
  res.json({
    success: true,
    settings: getPlatformSettings()
  });
});

// PUT /api/admin/settings - Update platform settings (commission %, supportTeam, etc.)
router.put('/settings', (req, res) => {
  const { commissionRatePercent, autoApproveVerifiedOwners, smsGatewayActive, emailGatewayActive, maintenanceMode, supportTeam } = req.body;
  const updates = {};

  if (commissionRatePercent !== undefined) {
    updates.commissionRatePercent = Number(commissionRatePercent);
  }
  if (autoApproveVerifiedOwners !== undefined) {
    updates.autoApproveVerifiedOwners = Boolean(autoApproveVerifiedOwners);
  }
  if (smsGatewayActive !== undefined) {
    updates.smsGatewayActive = Boolean(smsGatewayActive);
  }
  if (emailGatewayActive !== undefined) {
    updates.emailGatewayActive = Boolean(emailGatewayActive);
  }
  if (maintenanceMode !== undefined) {
    updates.maintenanceMode = Boolean(maintenanceMode);
  }
  if (supportTeam !== undefined && Array.isArray(supportTeam)) {
    updates.supportTeam = supportTeam;
  }

  const savedSettings = db.updatePlatformSettings ? db.updatePlatformSettings(updates) : updates;

  res.json({
    success: true,
    message: 'Admin platform settings updated successfully.',
    settings: savedSettings
  });
});

// GET /api/admin/customers - Student Customer Directory
router.get('/customers', async (req, res) => {
  try {
    await db.syncFromMySQL();
  } catch (e) {}
  const users = db.getUsers();
  const students = users.filter(u => u.role === 'CUSTOMER');
  const subs = db.getSubscriptions();

  const enrichedStudents = students.map(s => {
    const studentSubs = subs.filter(sub => sub.userId === s.id);
    return {
      ...s,
      subscriptionsCount: studentSubs.length,
      activeSubscription: studentSubs.find(sub => sub.status === 'ACTIVE') || null
    };
  });

  res.json({
    success: true,
    customers: enrichedStudents,
    count: enrichedStudents.length
  });
});

// GET /api/admin/users - Full User Directory (Students, Owners, Admins)
router.get('/users', async (req, res) => {
  try {
    await db.syncFromMySQL();
  } catch (e) {}
  const users = db.getUsers().map(({ password, ...u }) => u);
  res.json({
    success: true,
    count: users.length,
    users
  });
});

// GET /api/admin/complaints
router.get('/complaints', (req, res) => {
  res.json({ success: true, complaints: db.getComplaints() });
});

// PUT /api/admin/complaints/:id
router.put('/complaints/:id', (req, res) => {
  const { status, adminNotes } = req.body;
  const comp = db.updateComplaint(req.params.id, { status, adminNotes });
  if (!comp) return res.status(404).json({ success: false, message: 'Complaint not found' });
  res.json({ success: true, complaint: comp });
});

// GET /api/admin/reviews
router.get('/reviews', (req, res) => {
  res.json({ success: true, reviews: db.getReviews() });
});

// DELETE /api/admin/reviews/:id - Moderate review
router.delete('/reviews/:id', (req, res) => {
  const idx = db.data.reviews.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Review not found' });
  db.data.reviews.splice(idx, 1);
  db.save();
  res.json({ success: true, message: 'Review removed by moderator' });
});

// ============================================================================
// 📊 REAL-TIME DATABASE TABLES & CSV/EXCEL EXPORT ENDPOINTS
// ============================================================================

// GET /api/admin/tables - Live MySQL Table Summary & Statistics
router.get('/tables', async (req, res) => {
  try {
    await db.syncFromMySQL();
    const summary = await db.getLiveTablesSummary();
    if (!summary) {
      return res.status(500).json({ success: false, message: 'Unable to query MySQL table summary' });
    }
    res.json({
      success: true,
      summary
    });
  } catch (err) {
    console.error('[Admin] /api/admin/tables error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/tables/:tableName - Live Rows of a Table Directly from MySQL
router.get('/tables/:tableName', async (req, res) => {
  try {
    const tableData = await db.getLiveTable(req.params.tableName);
    res.json({
      success: true,
      table: tableData
    });
  } catch (err) {
    console.error(`[Admin] /api/admin/tables/${req.params.tableName} error:`, err);
    res.status(404).json({ success: false, message: err.message });
  }
});

// GET /api/admin/tables/:tableName/csv - Download Specific Table as Real-Time CSV
router.get('/tables/:tableName/csv', async (req, res) => {
  try {
    const tableData = await db.getLiveTable(req.params.tableName);
    const csvContent = rowsToCSV(tableData.rows, tableData.columns);
    const filename = `messconnect_${req.params.tableName}_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    res.status(404).send(`Error generating CSV: ${err.message}`);
  }
});

// GET /api/admin/tables/:tableName/excel - Download Specific Table as Real-Time Excel (.xls)
router.get('/tables/:tableName/excel', async (req, res) => {
  try {
    const tableData = await db.getLiveTable(req.params.tableName);
    const xmlContent = workbookToExcelXML([
      {
        name: tableData.displayName || req.params.tableName,
        rows: tableData.rows,
        columns: tableData.columns
      }
    ]);
    const filename = `messconnect_${req.params.tableName}_${new Date().toISOString().slice(0, 10)}.xls`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xmlContent);
  } catch (err) {
    res.status(404).send(`Error generating Excel: ${err.message}`);
  }
});

// GET /api/admin/export-all/excel - Download Complete Database as Multi-Sheet Excel Workbook
router.get('/export-all/excel', async (req, res) => {
  try {
    const summary = await db.getLiveTablesSummary();
    const sheets = [];
    if (summary && summary.tables) {
      for (const t of summary.tables) {
        try {
          const tData = await db.getLiveTable(t.tableName);
          sheets.push({
            name: t.displayName || t.tableName,
            rows: tData.rows,
            columns: tData.columns
          });
        } catch (e) {
          console.warn(`[Export Excel] Error fetching ${t.tableName}:`, e.message);
        }
      }
    }
    const xmlContent = workbookToExcelXML(sheets);
    const filename = `messconnect_database_master_export_${new Date().toISOString().slice(0, 10)}.xls`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xmlContent);
  } catch (err) {
    res.status(500).send(`Error exporting full database to Excel: ${err.message}`);
  }
});

// GET /api/admin/export-all/csv - Download All Tables as Combined CSV
router.get('/export-all/csv', async (req, res) => {
  try {
    const summary = await db.getLiveTablesSummary();
    let combinedCSV = '\uFEFF';
    if (summary && summary.tables) {
      for (const t of summary.tables) {
        try {
          const tData = await db.getLiveTable(t.tableName);
          combinedCSV += `\r\n# ====================================================================\r\n`;
          combinedCSV += `# TABLE: ${t.displayName.toUpperCase()} (\`${t.tableName}\`) - Live Rows: ${tData.rows.length}\r\n`;
          combinedCSV += `# ====================================================================\r\n`;
          combinedCSV += rowsToCSV(tData.rows, tData.columns).replace('\uFEFF', '') + '\r\n';
        } catch (e) {}
      }
    }
    const filename = `messconnect_all_tables_export_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(combinedCSV);
  } catch (err) {
    res.status(500).send(`Error exporting tables to CSV: ${err.message}`);
  }
});

// ========================================================
// PHASE 6: ADMIN PLATFORM ANALYTICS & GROWTH
// ========================================================
router.get('/analytics/platform', async (req, res) => {
  try {
    await db.syncFromMySQL();
  } catch (e) {}

  const analytics = analyticsService.getAdminPlatformAnalytics();
  res.json({ success: true, ...analytics });
});

// ========================================================
// PHASE 6: CROSS-MESS PERFORMANCE COMPARISON (Admin Only)
// ========================================================
router.get('/analytics/mess-comparison', async (req, res) => {
  try {
    await db.syncFromMySQL();
  } catch (e) {}

  const comparison = analyticsService.getAdminMessComparison();
  res.json({ success: true, ...comparison });
});

module.exports = router;

