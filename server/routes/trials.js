const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/trials
router.get('/', (req, res) => {
  const { userId, messId } = req.query;
  let trials = db.getTrials();
  if (userId) trials = trials.filter(t => t.userId === userId);
  if (messId) trials = trials.filter(t => t.messId === messId);
  res.json({ success: true, count: trials.length, trials });
});

// POST /api/trials - Book trial meal
router.post('/', (req, res) => {
  const { userId, messId, mealType, date, paymentMethod } = req.body;
  const mess = db.getMessById(messId);
  if (!mess) return res.status(404).json({ success: false, message: 'Mess not found' });

  // Prevent duplicate trial abuse for the same mess
  const existingTrials = userId ? db.getUserTrials(userId) : [];
  const duplicate = existingTrials.find(t => t.messId === messId && (t.status === 'PENDING' || t.status === 'APPROVED'));
  if (duplicate) {
    return res.status(400).json({
      success: false,
      message: 'You already have an active trial booked for this mess. Duplicate trial abuse is restricted.'
    });
  }

  const user = (userId && db.getUserById(userId)) || { id: userId, name: "Student", phone: "" };

  const trial = db.createTrial({
    userId: user.id || userId,
    userName: user.name,
    userPhone: user.phone,
    messId,
    messName: mess.name,
    mealType: mealType || 'Lunch',
    date: date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
    price: mess.trialPrice || 70
  });

  // Record payment
  db.createPayment({
    userId: trial.userId,
    messId,
    trialId: trial.id,
    amount: trial.price,
    method: paymentMethod || 'Online Payment',
    status: 'SUCCESS',
    description: `Trial Meal - ${trial.mealType} at ${mess.name}`
  });

  // Notify Owner
  if (mess.ownerId) {
    db.createNotification({
      userId: mess.ownerId,
      channel: 'Trials',
      title: '🍲 New Trial Meal Request',
      message: `${trial.userName} requested a trial ${trial.mealType} for ${trial.date}.`,
      type: 'TRIAL_REQUEST'
    });
  }

  // Notify Customer
  db.createNotification({
    userId: trial.userId,
    channel: 'Trials',
    title: '⌛ Trial Booked (Pending Approval)',
    message: `Your trial ${trial.mealType} at ${mess.name} has been sent to the owner for approval.`,
    type: 'TRIAL_PENDING'
  });

  res.status(201).json({ success: true, trial });
});

// PUT /api/trials/:id/status - Approve or reject trial
router.put('/:id/status', (req, res) => {
  const { status } = req.body; // 'APPROVED' or 'REJECTED'
  const trial = db.updateTrialStatus(req.params.id, status);
  if (!trial) return res.status(404).json({ success: false, message: 'Trial not found' });

  const isApproved = status === 'APPROVED';
  db.createNotification({
    userId: trial.userId,
    channel: 'Trials',
    title: isApproved ? '✅ Trial Approved!' : '❌ Trial Request Declined',
    message: isApproved
      ? `Your trial ${trial.mealType} at ${trial.messName} on ${trial.date} is confirmed! Enjoy your meal.`
      : `Your trial request at ${trial.messName} could not be accepted. Amount will be refunded.`,
    type: isApproved ? 'TRIAL_APPROVED' : 'TRIAL_REJECTED'
  });

  res.json({ success: true, trial });
});

module.exports = router;
