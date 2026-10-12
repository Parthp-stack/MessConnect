const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/flexipass/tiers - List available campus flexipass options
router.get('/tiers', (req, res) => {
  const tiers = db.getFlexipassTiers();
  const allMesses = db.getMesses();

  // Populate participating mess summaries
  const populated = tiers.map(t => ({
    ...t,
    participatingMesses: (t.participatingMessIds || []).map(mId => {
      const mess = allMesses.find(m => m.id === mId);
      return {
        id: mId,
        name: mess?.name || mId,
        rating: mess?.rating || 4.5,
        area: mess?.area || 'Campus Cluster',
        distance: mess?.distance || '0.5 km',
        isPureVeg: !!mess?.isPureVeg
      };
    })
  }));

  res.json({ success: true, count: populated.length, tiers: populated });
});

// GET /api/flexipass/user - Get student's active flexipasses
router.get('/user', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.json({ success: true, count: 0, flexipasses: [] });
  }
  const passes = db.getFlexipasses(userId);
  const allMesses = db.getMesses();

  const enriched = passes.map(p => ({
    ...p,
    participatingMesses: (p.participatingMessIds || []).map(mId => {
      const mess = allMesses.find(m => m.id === mId);
      return {
        id: mId,
        name: mess?.name || mId,
        rating: mess?.rating || 4.5,
        area: mess?.area || 'Campus Zone',
        distance: mess?.distance || '0.5 km',
        isPureVeg: !!mess?.isPureVeg,
        timings: mess?.timings
      };
    })
  }));

  res.json({ success: true, count: enriched.length, flexipasses: enriched });
});

// POST /api/flexipass/subscribe - Purchase / Activate a Campus FlexiPass
router.post('/subscribe', (req, res) => {
  const { userId, tierId, paymentMethod } = req.body;
  if (!userId || !tierId) {
    return res.status(400).json({ success: false, message: 'Missing userId or tierId' });
  }
  const flexipass = db.createFlexipass({
    userId,
    tierId,
    paymentMethod: paymentMethod || 'UPI'
  });

  res.status(201).json({
    success: true,
    message: 'Campus FlexiPass successfully activated!',
    flexipass
  });
});

module.exports = router;
