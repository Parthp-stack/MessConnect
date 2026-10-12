const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/subscriptions
router.get('/', (req, res) => {
  const { userId, messId } = req.query;
  let subs = db.getSubscriptions();
  if (userId) subs = subs.filter(s => s.userId === userId);
  if (messId) subs = subs.filter(s => s.messId === messId);
  res.json({ success: true, count: subs.length, subscriptions: subs });
});

// POST /api/subscriptions - Subscribe
router.post('/', (req, res) => {
  const { userId, messId, planId, amount, paymentMethod } = req.body;
  const mess = db.getMessById(messId);
  if (!mess) return res.status(404).json({ success: false, message: 'Mess not found' });

  const plan = mess.plans?.find(p => p.id === planId) || {
    name: "Custom Plan",
    periodDays: 30,
    mealsIncluded: ["Breakfast", "Lunch", "Dinner"]
  };

  const user = (userId && db.getUserById(userId)) || { id: userId, name: "Student" };

  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + (plan.periodDays || 30));

  const subscription = db.createSubscription({
    userId: user.id || userId,
    userName: user.name,
    messId,
    messName: mess.name,
    planId,
    planName: plan.name,
    amount: amount || plan.price || 3000,
    meals: plan.mealsIncluded,
    startDate: today.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    totalDays: plan.periodDays || 30,
    activeDays: 0,
    pausedDays: 0,
    remainingDays: plan.periodDays || 30
  });

  // Record mock payment
  const payment = db.createPayment({
    userId: subscription.userId,
    messId,
    subscriptionId: subscription.id,
    amount: subscription.amount,
    method: paymentMethod || 'Mock UPI',
    status: 'SUCCESS',
    description: `Subscription - ${subscription.planName} (${mess.name})`
  });

  // Notify customer
  db.createNotification({
    userId: subscription.userId,
    channel: 'Subscriptions',
    title: '🎉 Subscription Activated!',
    message: `You are now subscribed to ${mess.name} (${plan.name}). Valid until ${subscription.endDate}.`,
    type: 'SUBSCRIPTION_ACTIVE'
  });

  // Notify owner
  if (mess.ownerId) {
    db.createNotification({
      userId: mess.ownerId,
      channel: 'Subscriptions',
      title: '👤 New Student Subscribed!',
      message: `${user ? user.name : 'A student'} subscribed to ${plan.name}.`,
      type: 'OWNER_NEW_SUB'
    });
  }

  res.status(201).json({
    success: true,
    subscription,
    payment
  });
});

const handlePause = (req, res) => {
  const { startDate, endDate, reason, daysCount } = req.body;
  const days = parseInt(daysCount, 10) || 5;

  const sub = db.pauseSubscription(req.params.id, {
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: endDate || '2026-09-25',
    reason: reason || 'Student leave / Holiday',
    daysCount: days
  });

  if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

  // Notifications
  db.createNotification({
    userId: sub.userId,
    channel: 'Subscriptions',
    title: '⏸️ Subscription Paused',
    message: `Your meals at ${sub.messName} are paused for ${days} days. Your validity has been extended.`,
    type: 'PAUSE_CONFIRM'
  });

  const mess = db.getMessById(sub.messId);
  if (mess) {
    db.createNotification({
      userId: mess.ownerId,
      channel: 'Subscriptions',
      title: '⏸️ Customer Paused Meals',
      message: `${sub.userName || 'A subscriber'} paused meals for ${days} days.`,
      type: 'OWNER_CUSTOMER_PAUSE'
    });
  }

  res.json({ success: true, subscription: sub });
};

// POST & PUT /api/subscriptions/:id/pause
router.post('/:id/pause', handlePause);
router.put('/:id/pause', handlePause);

const handleResume = (req, res) => {
  const sub = db.resumeSubscription(req.params.id);
  if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

  db.createNotification({
    userId: sub.userId,
    channel: 'Subscriptions',
    title: '▶️ Meals Resumed!',
    message: `Your meals at ${sub.messName} are now active. Enjoy your meals!`,
    type: 'RESUME_CONFIRM'
  });

  res.json({ success: true, subscription: sub });
};

// POST & PUT /api/subscriptions/:id/resume
router.post('/:id/resume', handleResume);
router.put('/:id/resume', handleResume);

const handleCancel = (req, res) => {
  const { reason } = req.body;
  const sub = db.cancelSubscription(req.params.id, reason);
  if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

  db.createNotification({
    userId: sub.userId,
    channel: 'Subscriptions',
    title: 'Subscription Cancelled',
    message: `Your subscription to ${sub.messName} has been cancelled.`,
    type: 'CANCEL_CONFIRM'
  });

  res.json({ success: true, subscription: sub });
};

// POST & PUT /api/subscriptions/:id/cancel
router.post('/:id/cancel', handleCancel);
router.put('/:id/cancel', handleCancel);

module.exports = router;
