const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { sendMenuUpdateEmail } = require('../services/emailService');

// GET /api/messes - List & Filter
router.get('/', (req, res) => {
  let messes = db.getMesses();
  const { search, area, city, isPureVeg, maxPrice, minRating, trialAvailable, sort, meal } = req.query;

  // STRICT RULE: Only return messes that are ACTUALLY registered through our system by a real OWNER account!
  const users = db.getUsers();
  const registeredOwners = users.filter(u => u.role === 'OWNER');
  const registeredOwnerIds = new Set(registeredOwners.map(u => u.id));
  const registeredMessIds = new Set(registeredOwners.map(u => u.messId).filter(Boolean));

  messes = messes.filter(m => {
    if (!m) return false;
    // Reject dummy or synthetic IDs
    if (
      m.id === 'mess_alandi_1' ||
      m.id?.startsWith('mess_demo') ||
      ['mess_1', 'mess_2', 'mess_3', 'mess_4', 'mess_5', 'mess_6', 'mess_moshi_1', 'mess_ravet_1'].includes(m.id)
    ) {
      return false;
    }

    // Must have a real registered owner account created through the registration system
    const matchingOwner = registeredOwners.find(u =>
      u.id === m.ownerId ||
      u.messId === m.id ||
      (m.phone && u.phone === m.phone) ||
      (m.email && u.email && u.email.toLowerCase() === m.email.toLowerCase())
    );
    const isRegisteredThroughSystem = Boolean(matchingOwner) || registeredOwnerIds.has(m.ownerId) || registeredMessIds.has(m.id);
    if (!isRegisteredThroughSystem) return false;

    // All registered messes are active and visible (document verification requirement removed)
    if (m.status === 'SUSPENDED' || m.status === 'REJECTED') return false;

    m.verified = true;
    m.verificationStatus = 'APPROVED';
    if (m.status !== 'SUSPENDED') m.status = 'ACTIVE';

    // Auto-sync approved status and linkage
    if (matchingOwner) {
      matchingOwner.verified = true;
      matchingOwner.verificationStatus = 'APPROVED';
      matchingOwner.status = 'ACTIVE';
      if (!m.ownerId) m.ownerId = matchingOwner.id;
      if (!matchingOwner.messId) matchingOwner.messId = m.id;
    }

    return true;
  });

  if (search) {
    const q = search.toLowerCase();
    messes = messes.filter(m => 
      m.name?.toLowerCase().includes(q) ||
      m.area?.toLowerCase().includes(q) ||
      m.city?.toLowerCase().includes(q) ||
      m.pincode?.includes(q) ||
      m.description?.toLowerCase().includes(q)
    );
  }

  // Filter strictly by requested area without falling back to unrelated localities
  if (area && area !== 'all') {
    messes = messes.filter(m => m.area && m.area.toLowerCase().includes(area.toLowerCase()));
  }

  if (city) {
    messes = messes.filter(m => m.city?.toLowerCase().includes(city.toLowerCase()));
  }

  if (isPureVeg === 'true') {
    messes = messes.filter(m => m.isPureVeg);
  }

  if (maxPrice) {
    messes = messes.filter(m => m.pricePerMonth <= parseInt(maxPrice, 10));
  }

  if (minRating) {
    messes = messes.filter(m => m.rating >= parseFloat(minRating));
  }

  if (trialAvailable === 'true') {
    messes = messes.filter(m => m.trialAvailable);
  }

  if (meal) {
    // Filter by meal availability
    if (meal === 'breakfast') messes = messes.filter(m => m.timings?.breakfast);
    if (meal === 'lunch') messes = messes.filter(m => m.timings?.lunch);
    if (meal === 'dinner') messes = messes.filter(m => m.timings?.dinner);
  }

  // Sorting
  if (sort === 'rating') {
    messes.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'price_asc') {
    messes.sort((a, b) => a.pricePerMonth - b.pricePerMonth);
  } else if (sort === 'price_desc') {
    messes.sort((a, b) => b.pricePerMonth - a.pricePerMonth);
  } else if (sort === 'nearest') {
    messes.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  }

  res.json({ success: true, count: messes.length, messes });
});

// GET /api/messes/favorites/list
router.get('/favorites/list', (req, res) => {
  const favoriteIds = db.getFavorites();
  const messes = db.getMesses().filter(m => favoriteIds.includes(m.id));
  res.json({ success: true, favorites: messes, favoriteIds });
});

// GET /api/messes/offers - All broadcast offers
router.get('/offers', (req, res) => {
  const offers = db.data.offers || [];
  res.json({ success: true, count: offers.length, offers });
});

// GET /api/messes/:id
router.get('/:id', (req, res) => {
  const mess = db.getMessById(req.params.id);
  if (!mess || mess.id === 'mess_alandi_1') return res.status(404).json({ success: false, message: 'Mess not found or not registered through MessConnect' });

  const users = db.getUsers();
  const registeredOwners = users.filter(u => u.role === 'OWNER');
  const isRegisteredThroughSystem = registeredOwners.some(u => u.id === mess.ownerId || u.messId === mess.id);
  if (!isRegisteredThroughSystem) {
    return res.status(404).json({ success: false, message: 'Mess not registered through MessConnect system' });
  }
  
  const reviews = db.getMessReviews(req.params.id);
  const favoriteIds = db.getFavorites();
  const isFavorite = favoriteIds.includes(mess.id);

  res.json({
    success: true,
    mess: {
      ...mess,
      reviews,
      isFavorite
    }
  });
});

// GET /api/messes/:id/menu/today
router.get('/:id/menu/today', (req, res) => {
  const mess = db.getMessById(req.params.id);
  if (!mess) return res.status(404).json({ success: false, message: 'Mess not found' });
  res.json({ success: true, menuToday: mess.menuToday, timings: mess.timings });
});

// GET /api/messes/:id/menu/weekly
router.get('/:id/menu/weekly', (req, res) => {
  const mess = db.getMessById(req.params.id);
  if (!mess) return res.status(404).json({ success: false, message: 'Mess not found' });
  res.json({ success: true, weeklyMenu: mess.weeklyMenu });
});

// PUT /api/messes/:id/menu - Owner menu & image update with subscriber email notifications
router.put('/:id/menu', async (req, res) => {
  const { menuToday, weeklyMenu, coverImage, gallery } = req.body;
  const updates = {};
  if (menuToday) updates.menuToday = menuToday;
  if (weeklyMenu) updates.weeklyMenu = weeklyMenu;
  if (coverImage) updates.coverImage = coverImage;
  if (gallery) updates.gallery = gallery;

  const updated = db.updateMess(req.params.id, updates);
  if (!updated) return res.status(404).json({ success: false, message: 'Mess not found' });

  // 1. Find all active subscriptions for this mess
  const subs = db.getMessSubscriptions(req.params.id);
  const activeSubs = subs.filter(s => s.status === 'ACTIVE');

  // 2. Extract unique students with valid registered emails
  const studentMap = new Map();
  for (const s of activeSubs) {
    const user = db.getUserById(s.userId);
    const email = user?.email || s.userEmail;
    if (email && !studentMap.has(email)) {
      studentMap.set(email, {
        userId: s.userId,
        name: user?.name || s.userName || 'Student',
        email: email.trim()
      });
    }
  }

  // 3. Send email to each registered student and save in-app notification
  let emailsSent = 0;
  const emailPromises = [];

  for (const student of studentMap.values()) {
    // In-app alert
    db.createNotification({
      userId: student.userId,
      channel: 'Meals',
      title: `🍽️ ${updated.name} Menu Updated!`,
      message: `Today's menu at ${updated.name} has been updated. Check today's fresh meal lineup!`,
      type: 'MENU_UPDATE'
    });

    // Real email dispatch
    emailPromises.push(
      sendMenuUpdateEmail({
        studentEmail: student.email,
        studentName: student.name,
        messName: updated.name,
        menuToday: updated.menuToday,
        messImage: updated.coverImage
      })
      .then(r => {
        if (r && r.success) emailsSent++;
      })
      .catch(err => {
        console.warn(`[Menu Update Email Error] Failed for ${student.email}:`, err.message);
      })
    );
  }

  // Await all notification dispatches
  if (emailPromises.length > 0) {
    await Promise.allSettled(emailPromises);
  }

  res.json({
    success: true,
    mess: updated,
    notifiedSubscribersCount: studentMap.size,
    emailsSent,
    message: studentMap.size > 0
      ? `Today's menu updated! Sent email notification to ${studentMap.size} subscribed student(s) at their registered email.`
      : "Today's menu and kitchen photo updated successfully! (No active subscribers currently enrolled)"
  });
});

// POST /api/messes - Developer/Manual Add Mess
router.post('/', (req, res) => {
  const newMess = db.createMess(req.body);
  res.status(201).json({ success: true, mess: newMess });
});

// PUT /api/messes/:id
router.put('/:id', (req, res) => {
  const updated = db.updateMess(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Mess not found' });
  res.json({ success: true, mess: updated });
});

// DELETE /api/messes/:id
router.delete('/:id', (req, res) => {
  const ok = db.deleteMess(req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: 'Mess not found' });
  res.json({ success: true, message: 'Mess deleted successfully' });
});

// GET /api/messes/:id/reviews - Get reviews for a mess
router.get('/:id/reviews', (req, res) => {
  const reviews = db.getMessReviews(req.params.id);
  res.json({ success: true, count: reviews.length, reviews });
});

// POST /api/messes/:id/reviews - Add review
router.post('/:id/reviews', (req, res) => {
  const mess = db.getMessById(req.params.id);
  if (!mess) return res.status(404).json({ success: false, message: 'Mess not found' });
  const { rating, foodQualityRating, hygieneRating, comment, userId, userName } = req.body;
  const review = db.createReview({
    messId: req.params.id,
    userId: userId || req.headers['x-user-id'] || 'user_student',
    userName: userName || 'Student',
    rating: Number(rating) || 5,
    foodQualityRating: Number(foodQualityRating) || 5,
    hygieneRating: Number(hygieneRating) || 5,
    comment: comment || ''
  });
  res.status(201).json({ success: true, review });
});

// POST /api/messes/:id/favorite - Toggle favorite
router.post('/:id/favorite', (req, res) => {
  const favs = db.toggleFavorite(req.params.id);
  const isFavorite = favs.includes(req.params.id);
  res.json({ success: true, isFavorite, favorites: favs });
});

// ========================================================
// SECTION 2: MESS OWNER SUBSCRIPTION PLANS API
// ========================================================

// GET /api/messes/:id/plans - Get all plans for a mess
router.get('/:id/plans', (req, res) => {
  const mess = db.getMessById(req.params.id);
  if (!mess) return res.status(404).json({ success: false, message: 'Mess not found' });
  const plans = db.getMessPlans(req.params.id);
  res.json({ success: true, count: plans.length, plans });
});

// POST /api/messes/:id/plans - Create a new plan
router.post('/:id/plans', (req, res) => {
  const mess = db.getMessById(req.params.id);
  if (!mess) return res.status(404).json({ success: false, message: 'Mess not found' });

  const { name, description, price, duration, durationDays, periodDays, mealsIncluded, maxMembers, popular } = req.body;

  // Server-side validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Plan name is required.' });
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    return res.status(400).json({ success: false, message: 'Plan price must be a valid positive amount.' });
  }

  const days = parseInt(durationDays || periodDays || (duration === 'Weekly' ? 7 : 30), 10);
  if (isNaN(days) || days <= 0) {
    return res.status(400).json({ success: false, message: 'Plan duration must be at least 1 day.' });
  }

  const newPlan = db.addMessPlan(req.params.id, {
    name: name.trim(),
    description: description || '',
    price: Math.round(numPrice),
    periodDays: days,
    durationDays: days,
    duration: duration || (days === 7 ? 'Weekly' : days === 15 ? '15 Days' : 'Monthly'),
    mealsIncluded: Array.isArray(mealsIncluded) && mealsIncluded.length > 0 ? mealsIncluded : ['Breakfast', 'Lunch', 'Dinner'],
    maxMembers: maxMembers ? parseInt(maxMembers, 10) : null,
    popular: Boolean(popular),
    status: 'ACTIVE',
    isActive: true
  });

  res.status(201).json({
    success: true,
    message: 'Subscription plan created successfully.',
    plan: newPlan
  });
});

// PUT /api/messes/:id/plans/:planId - Update an existing plan
router.put('/:id/plans/:planId', (req, res) => {
  const mess = db.getMessById(req.params.id);
  if (!mess) return res.status(404).json({ success: false, message: 'Mess not found' });

  const { price, name, periodDays, durationDays } = req.body;

  if (price !== undefined) {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Plan price must be a valid positive amount.' });
    }
  }

  if (name !== undefined && (!name || !String(name).trim())) {
    return res.status(400).json({ success: false, message: 'Plan name cannot be empty.' });
  }

  if (durationDays !== undefined || periodDays !== undefined) {
    const days = parseInt(durationDays || periodDays, 10);
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ success: false, message: 'Plan duration must be at least 1 day.' });
    }
  }

  const updatedPlan = db.updateMessPlan(req.params.id, req.params.planId, req.body);
  if (!updatedPlan) {
    return res.status(404).json({ success: false, message: 'Plan not found.' });
  }

  res.json({
    success: true,
    message: 'Subscription plan updated successfully.',
    plan: updatedPlan
  });
});

// DELETE /api/messes/:id/plans/:planId - Delete or deactivate a plan
router.delete('/:id/plans/:planId', (req, res) => {
  const mess = db.getMessById(req.params.id);
  if (!mess) return res.status(404).json({ success: false, message: 'Mess not found' });

  const ok = db.deleteMessPlan(req.params.id, req.params.planId);
  if (!ok) return res.status(404).json({ success: false, message: 'Plan not found.' });

  res.json({ success: true, message: 'Plan removed or marked inactive successfully.' });
});

module.exports = router;
