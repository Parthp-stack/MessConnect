const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/checkin/pass - Get current active student meal pass
router.get('/pass', (req, res) => {
  const { userId, messId } = req.query;
  if (!userId) {
    return res.json({ success: true, pass: null });
  }
  const pass = db.getStudentPass(userId, messId);
  res.json({ success: true, pass });
});

// POST /api/checkin/verify - Owner scanner entrance verification
router.post('/verify', (req, res) => {
  const { token, messId, mealType, method } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Missing pass token or QR payload' });
  }

  const result = db.verifyAndConsumePass({
    token,
    messId,
    mealType,
    method: method || 'QR_SCAN'
  });

  res.json({ success: true, ...result });
});

// GET /api/checkin/history - Owner view today's checkins
router.get('/history', (req, res) => {
  const { messId, date } = req.query;
  if (!messId) {
    return res.json({ success: true, count: 0, checkins: [] });
  }
  const checkins = db.getCheckins(messId, date || new Date().toISOString().split('T')[0]);
  res.json({
    success: true,
    count: checkins.length,
    checkins
  });
});

module.exports = router;
