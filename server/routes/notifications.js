const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/notifications
router.get('/', (req, res) => {
  const { userId, type, status } = req.query;
  const headerUserId = req.headers['x-user-id'];
  const effectiveUserId = userId || headerUserId;

  let allUserNotifs = effectiveUserId ? db.getNotifications(effectiveUserId) : [];

  // Filter by notification type: ATTENDANCE, PAYMENT, SUBSCRIPTION, MENU, ANNOUNCEMENT, SYSTEM
  if (type && type !== 'ALL') {
    allUserNotifs = allUserNotifs.filter(n => (n.type || '').toUpperCase() === type.toUpperCase());
  }

  // Filter by read/unread status
  let filtered = [...allUserNotifs];
  if (status === 'UNREAD') {
    filtered = filtered.filter(n => !n.read);
  } else if (status === 'READ') {
    filtered = filtered.filter(n => n.read);
  }

  const unreadCount = allUserNotifs.filter(n => !n.read).length;

  // Breakdown of unread by category
  const breakdown = {
    ATTENDANCE: allUserNotifs.filter(n => !n.read && (n.type || '').toUpperCase() === 'ATTENDANCE').length,
    PAYMENT: allUserNotifs.filter(n => !n.read && (n.type || '').toUpperCase() === 'PAYMENT').length,
    SUBSCRIPTION: allUserNotifs.filter(n => !n.read && (n.type || '').toUpperCase() === 'SUBSCRIPTION').length,
    MENU: allUserNotifs.filter(n => !n.read && (n.type || '').toUpperCase() === 'MENU').length,
    ANNOUNCEMENT: allUserNotifs.filter(n => !n.read && (n.type || '').toUpperCase() === 'ANNOUNCEMENT').length,
    SYSTEM: allUserNotifs.filter(n => !n.read && (n.type || '').toUpperCase() === 'SYSTEM').length
  };

  res.json({
    success: true,
    count: filtered.length,
    unreadCount,
    breakdown,
    notifications: filtered
  });
});

// POST /api/notifications - Send notification with deduplication guard
router.post('/', (req, res) => {
  const { userId, title, message, type = 'SYSTEM', channel = 'System' } = req.body;

  // Deduplication check: Do not re-create identical notification sent in the last 15 minutes
  const existing = (db.data.notifications || []).find(n =>
    n.userId === userId &&
    n.title === title &&
    n.message === message &&
    (Date.now() - new Date(n.createdAt || n.timestamp || 0).getTime()) < 15 * 60 * 1000
  );

  if (existing) {
    return res.json({ success: true, notification: existing, deduplicated: true });
  }

  const notif = db.createNotification(req.body);
  res.status(201).json({ success: true, notification: notif });
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', (req, res) => {
  const notif = db.markNotificationRead(req.params.id);
  if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true, notification: notif });
});

// POST /api/notifications/mark-all-read - Mark all as read for user
router.post('/mark-all-read', (req, res) => {
  const { userId } = req.body;
  const headerUserId = req.headers['x-user-id'];
  const effectiveUserId = userId || headerUserId;

  const notifs = effectiveUserId ? db.getNotifications(effectiveUserId) : [];
  notifs.forEach(n => { n.read = true; });
  db.save();
  res.json({ success: true, message: 'All notifications marked as read' });
});

// DELETE /api/notifications/:id - Delete single notification
router.delete('/:id', (req, res) => {
  const deleted = db.deleteNotification(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true, message: 'Notification deleted' });
});

// PUT /api/notifications/preferences
router.put('/preferences', (req, res) => {
  const { userId, preferences } = req.body;
  const user = userId ? db.getUserById(userId) : null;
  if (user) {
    user.preferences = { ...user.preferences, ...preferences };
    db.save();
  }
  res.json({ success: true, preferences: user ? user.preferences : preferences });
});

module.exports = router;
