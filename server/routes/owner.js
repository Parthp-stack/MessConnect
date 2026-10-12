const express = require('express');
const router = express.Router();
const db = require('../db/database');
const analyticsService = require('../services/analyticsService');

// Security Guard: Prevent students from accessing owner portal endpoints
router.use((req, res, next) => {
  const role = req.headers['x-user-role'];
  if (role === 'CUSTOMER') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Students cannot access owner management or analytics endpoints.'
    });
  }
  next();
});

// Helper to resolve messId from query, user-id header, or first mess
const resolveOwnerMessId = (req) => {
  if (req.query.messId) return req.query.messId;
  const userId = req.headers['x-user-id'];
  if (userId) {
    const userMess = db.getMesses().find(m => m.ownerId === userId);
    if (userMess) return userMess.id;
  }
  return null;
};

// GET /api/owner/stats
router.get('/stats', (req, res) => {
  const messId = resolveOwnerMessId(req);
  if (!messId) {
    return res.json({
      success: true,
      mess: null,
      metrics: {
        activeSubscribers: 0,
        pausedSubscribers: 0,
        pendingTrialsCount: 0,
        monthlyRevenue: 0,
        todayTotalMealsServed: 0
      }
    });
  }

  const mess = db.getMessById(messId);
  const subs = db.getMessSubscriptions(messId);
  const activeSubs = subs.filter(s => s.status === 'ACTIVE');
  const pausedSubs = subs.filter(s => s.status === 'PAUSED');
  const trials = db.getMessTrials(messId);
  const pendingTrials = trials.filter(t => t.status === 'PENDING');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckins = db.getCheckins ? db.getCheckins(messId, todayStr) : [];
  const todayTotalMealsServed = todayCheckins.filter(c => c.status === 'VALID').length;

  const totalMonthlyRevenue = activeSubs.reduce((sum, s) => {
    return sum + (s.amount || s.price || mess?.pricePerMonth || 0);
  }, 0);

  res.json({
    success: true,
    mess: mess ? { id: mess.id, name: mess.name } : null,
    metrics: {
      activeSubscribers: activeSubs.length,
      pausedSubscribers: pausedSubs.length,
      pendingTrialsCount: pendingTrials.length,
      monthlyRevenue: totalMonthlyRevenue,
      todayTotalMealsServed: todayTotalMealsServed
    }
  });
});

// GET /api/owner/forecast - Section 21 Food Demand Forecast
router.get('/forecast', (req, res) => {
  const messId = resolveOwnerMessId(req);
  if (!messId) {
    return res.json({
      success: true,
      forecast: {
        targetDate: "Tomorrow",
        activeSubscribers: 0,
        pausedSubscribers: 0,
        breakdown: {
          breakfast: { active: 0, trials: 0, total: 0 },
          lunch: { active: 0, trials: 0, total: 0 },
          dinner: { active: 0, trials: 0, total: 0 }
        },
        expectedTotal: 0,
        safetyBufferPercentage: 0,
        safetyBufferMeals: 0,
        recommendedMealsToPrepare: 0,
        disclaimer: "No active subscriptions enrolled yet."
      }
    });
  }

  const forecast = db.calculateForecast(messId);
  if (!forecast) return res.status(404).json({ success: false, message: 'Mess not found' });
  res.json({ success: true, forecast });
});

// GET /api/owner/customers - Manage active and paused customers
router.get('/customers', (req, res) => {
  const messId = resolveOwnerMessId(req);
  if (!messId) {
    return res.json({ success: true, count: 0, customers: [] });
  }

  const subs = db.getMessSubscriptions(messId);

  // Return strictly real subscribers - No dummy records
  const roster = subs.map(s => {
    const studentUser = db.getUserById(s.userId);
    return {
      id: s.id,
      name: s.userName || studentUser?.name || "Student",
      phone: studentUser?.phone || s.userPhone || "",
      plan: s.planName || "Meal Pass",
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      activeDays: s.activeDays || 0,
      pausedDays: s.pausedDays || 0,
      currentPause: s.pauses?.find(p => p.status === 'ACTIVE_PAUSE') || null
    };
  });

  res.json({ success: true, count: roster.length, customers: roster });
});

// POST /api/owner/broadcast-offer - Section 20 Flash Deals & Offers
router.post('/broadcast-offer', (req, res) => {
  const { messId, title, description, discountPercent, validUntil } = req.body;
  const mess = messId ? db.getMessById(messId) : null;

  const offer = {
    id: `off_${Date.now()}`,
    messId: messId || (mess ? mess.id : null),
    messName: mess ? mess.name : 'Partner Mess',
    title,
    description,
    discountPercent,
    validUntil: validUntil || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  };

  db.data.offers = db.data.offers || [];
  db.data.offers.unshift(offer);

  // Notify all registered customers
  const customers = (db.data.users || []).filter(u => u.role === 'CUSTOMER');
  customers.forEach(c => {
    db.createNotification({
      userId: c.id,
      channel: 'Offers',
      title: `🎁 New Offer: ${title}`,
      message: `${mess ? mess.name : 'Mess'}: ${description}`,
      type: 'BROADCAST_OFFER'
    });
  });

  db.save();
  res.status(201).json({ success: true, offer });
});

// POST /api/owner/review-response
router.post('/review-response', (req, res) => {
  const { reviewId, responseText } = req.body;
  const review = db.respondToReview(reviewId, responseText);
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
  res.json({ success: true, review });
});

// ========================================================
// SECTION 13: OWNER REVENUE DASHBOARD API
// ========================================================
router.get('/revenue', (req, res) => {
  const messId = resolveOwnerMessId(req);
  if (!messId) {
    return res.json({
      success: true,
      mess: null,
      stats: {
        todayRevenue: 0,
        thisWeekRevenue: 0,
        thisMonthRevenue: 0,
        totalRevenue: 0,
        activeSubscribers: 0,
        expiredSubscribers: 0,
        revenueByPlan: [],
        verifiedTransactionsCount: 0
      }
    });
  }

  const mess = db.getMessById(messId);
  const stats = db.getMessRevenueStats(messId);

  res.json({
    success: true,
    mess: mess ? { id: mess.id, name: mess.name } : null,
    stats
  });
});

// ========================================================
// SECTION 14: OWNER PAYMENT HISTORY API
// ========================================================
router.get('/payments', (req, res) => {
  const messId = resolveOwnerMessId(req);
  if (!messId) {
    return res.json({ success: true, count: 0, payments: [] });
  }

  const { search, status, planId, dateRange } = req.query;
  const payments = db.getMessPayments(messId);

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonthPrefix = todayStr.substring(0, 7);

  let filtered = payments.map(p => {
    const studentUser = p.userId ? db.getUserById(p.userId) : null;
    const sub = p.subscriptionId ? db.getSubscriptionById(p.subscriptionId) : null;
    const plans = db.getMessPlans(messId);
    const plan = plans.find(pl => pl.id === p.planId || pl.id === sub?.planId);

    return {
      id: p.id,
      orderId: p.orderId,
      paymentId: p.paymentId,
      receiptNumber: p.receiptNumber || p.id,
      studentName: studentUser?.name || sub?.userName || 'Student',
      studentPhone: studentUser?.phone || sub?.userPhone || '',
      planName: plan?.name || sub?.planName || p.description || 'Meal Pass',
      planId: plan?.id || sub?.planId || p.planId,
      amount: Number(p.amount) || 0,
      currency: p.currency || 'INR',
      status: p.status,
      method: p.method,
      date: p.date || p.createdAt,
      verifiedAt: p.verifiedAt,
      subscriptionPeriod: sub ? `${sub.startDate} to ${sub.endDate}` : 'Single Period',
      hasVerifiedSignature: Boolean(p.signature)
    };
  });

  if (status && status !== 'All') {
    filtered = filtered.filter(p => p.status === status);
  }

  if (planId && planId !== 'All') {
    filtered = filtered.filter(p => p.planId === planId);
  }

  if (dateRange === 'today') {
    filtered = filtered.filter(p => {
      const dStr = p.date instanceof Date ? p.date.toISOString() : String(p.date || '');
      return dStr.startsWith(todayStr);
    });
  } else if (dateRange === 'week') {
    filtered = filtered.filter(p => {
      const d = new Date(p.date);
      return !isNaN(d.getTime()) && d >= sevenDaysAgo;
    });
  } else if (dateRange === 'month') {
    filtered = filtered.filter(p => {
      const dStr = p.date instanceof Date ? p.date.toISOString() : String(p.date || '');
      return dStr.startsWith(thisMonthPrefix);
    });
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(p =>
      p.studentName?.toLowerCase().includes(q) ||
      p.receiptNumber?.toLowerCase().includes(q) ||
      p.paymentId?.toLowerCase().includes(q) ||
      p.planName?.toLowerCase().includes(q)
    );
  }

  // Sort latest first
  filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  res.json({
    success: true,
    count: filtered.length,
    payments: filtered
  });
});

// ========================================================
// PHASE 6: ADVANCED OWNER ANALYTICS
// ========================================================
router.get('/analytics/advanced', (req, res) => {
  const messId = resolveOwnerMessId(req);
  if (!messId) {
    return res.status(400).json({ success: false, message: 'Mess ID required' });
  }

  const { rangePreset, startDate, endDate } = req.query;
  const analytics = analyticsService.getOwnerAdvancedAnalytics(messId, { rangePreset, startDate, endDate });
  if (!analytics) return res.status(404).json({ success: false, message: 'Mess not found' });

  res.json({ success: true, ...analytics });
});

// ========================================================
// PHASE 6: ATTENDANCE REPORTS
// ========================================================
router.get('/reports/attendance', (req, res) => {
  const messId = resolveOwnerMessId(req);
  if (!messId) {
    return res.status(400).json({ success: false, message: 'Mess ID required' });
  }

  const { rangePreset, startDate, endDate, session, student, status } = req.query;
  const report = analyticsService.getOwnerAttendanceReport(messId, {
    rangePreset,
    startDate,
    endDate,
    session,
    student,
    status
  });

  res.json({ success: true, ...report });
});

// ========================================================
// PHASE 6: PAYMENT REPORTS
// ========================================================
router.get('/reports/payments', (req, res) => {
  const messId = resolveOwnerMessId(req);
  if (!messId) {
    return res.status(400).json({ success: false, message: 'Mess ID required' });
  }

  const { rangePreset, startDate, endDate, planId, status, student } = req.query;
  const report = analyticsService.getOwnerPaymentReport(messId, {
    rangePreset,
    startDate,
    endDate,
    planId,
    status,
    student
  });

  res.json({ success: true, ...report });
});

// ========================================================
// PHASE 6: SUBSCRIPTION REPORTS
// ========================================================
router.get('/reports/subscriptions', (req, res) => {
  const messId = resolveOwnerMessId(req);
  if (!messId) {
    return res.status(400).json({ success: false, message: 'Mess ID required' });
  }

  const { rangePreset, startDate, endDate, status } = req.query;
  const report = analyticsService.getOwnerSubscriptionReport(messId, {
    rangePreset,
    startDate,
    endDate,
    status
  });

  res.json({ success: true, ...report });
});

// ========================================================
// PHASE 6: MENU ANALYTICS
// ========================================================
router.get('/reports/menu-analytics', (req, res) => {
  const messId = resolveOwnerMessId(req);
  if (!messId) {
    return res.status(400).json({ success: false, message: 'Mess ID required' });
  }

  const analytics = analyticsService.getOwnerMenuAnalytics(messId);
  res.json({ success: true, ...analytics });
});

// ========================================================
// PHASE 6: INDIVIDUAL STUDENT REPORT
// ========================================================
router.get('/reports/student/:studentId', (req, res) => {
  const messId = resolveOwnerMessId(req);
  const studentId = req.params.studentId;
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'Student ID required' });
  }

  const report = analyticsService.getIndividualStudentReport(messId, studentId);
  if (!report) return res.status(404).json({ success: false, message: 'Student report not found' });

  res.json({ success: true, ...report });
});

module.exports = router;

