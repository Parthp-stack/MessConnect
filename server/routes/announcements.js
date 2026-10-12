const express = require('express');
const router = express.Router();
const db = require('../db/database');
const communicationService = require('../services/communicationService');

// Helper to resolve user from request headers/auth
const getRequestUser = (req) => {
  const userId = req.headers['x-user-id'] || req.query.userId;
  const userRole = req.headers['x-user-role'] || req.query.userRole;
  if (userId) {
    const user = db.getUserById(userId);
    if (user) return user;
  }
  return { id: userId || null, role: userRole || 'CUSTOMER' };
};

// GET /api/announcements - Fetch visible announcements based on role & subscriptions
router.get('/', (req, res) => {
  try {
    const user = getRequestUser(req);
    const { status = 'ACTIVE' } = req.query;

    const allAnnouncements = db.getAnnouncements({ status: status === 'ALL' ? undefined : status })
      .filter(a => !a.title?.toLowerCase().includes('maintenance') && !a.message?.toLowerCase().includes('maintenance'));

    if (user.role === 'ADMIN') {
      return res.json({
        success: true,
        count: allAnnouncements.length,
        announcements: allAnnouncements
      });
    }

    if (user.role === 'OWNER') {
      const ownerMess = db.getMesses().find(m => m.ownerId === user.id);
      const ownerMessId = ownerMess ? ownerMess.id : user.messId;

      const visible = allAnnouncements.filter(a =>
        a.createdById === user.id ||
        a.target === 'ALL_OWNERS' ||
        (ownerMessId && a.messId === ownerMessId)
      );

      return res.json({
        success: true,
        count: visible.length,
        announcements: visible
      });
    }

    // Role is CUSTOMER (Student)
    // Find mess IDs of active/recent subscriptions for this student
    const studentSubs = user.id ? db.getUserSubscriptions(user.id) : [];
    const subscribedMessIds = new Set(studentSubs.map(s => s.messId));

    const visible = allAnnouncements.filter(a => {
      if (a.target === 'ALL_STUDENTS') return true;
      if (a.target === 'SPECIFIC_USER' && a.targetId === user.id) return true;
      if ((a.target === 'MESS_STUDENTS' || a.target === 'SPECIFIC_MESS') && a.messId && subscribedMessIds.has(a.messId)) {
        return true;
      }
      return false;
    });

    return res.json({
      success: true,
      count: visible.length,
      announcements: visible
    });
  } catch (err) {
    console.error('[Announcements] GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});

// POST /api/announcements/owner - Mess owner publishes an announcement to students
router.post('/owner', async (req, res) => {
  try {
    const user = getRequestUser(req);
    const { title, message, target = 'MESS_STUDENTS', targetId, targetName } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement title is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement message is required' });
    }

    // Resolve owner's mess
    const ownerMess = user.id ? (db.getMesses().find(m => m.ownerId === user.id) || (user.messId ? db.getMessById(user.messId) : null)) : null;
    const effectiveMessId = req.body.messId || (ownerMess ? ownerMess.id : null);

    if (!effectiveMessId) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Mess ID required to dispatch owner announcement' });
    }

    const result = await communicationService.dispatchAnnouncement({
      title: title.trim(),
      message: message.trim(),
      target: target || 'MESS_STUDENTS',
      targetId,
      targetName: targetName || (ownerMess ? ownerMess.name : 'Subscribed Students'),
      createdById: user.id || 'owner_1',
      createdByName: user.name || (ownerMess ? ownerMess.name : 'Mess Owner'),
      createdByRole: 'OWNER',
      messId: effectiveMessId
    });

    res.status(201).json({
      success: true,
      message: 'Announcement broadcasted successfully to students.',
      ...result
    });
  } catch (err) {
    console.error('[Announcements] Owner create error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to dispatch owner announcement' });
  }
});

// POST /api/announcements/admin - Admin publishes platform-wide or targeted announcement
router.post('/admin', async (req, res) => {
  try {
    const user = getRequestUser(req);
    const { title, message, target = 'ALL_STUDENTS', targetId, targetName, messId } = req.body;

    if (user.role !== 'ADMIN' && req.headers['x-user-role'] !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access Denied: Admin authorization required' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement title is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement message is required' });
    }

    const result = await communicationService.dispatchAnnouncement({
      title: title.trim(),
      message: message.trim(),
      target: target || 'ALL_STUDENTS',
      targetId,
      targetName,
      createdById: user.id || 'user_admin_1',
      createdByName: user.name || 'Platform Admin',
      createdByRole: 'ADMIN',
      messId: messId || null
    });

    res.status(201).json({
      success: true,
      message: 'Platform announcement broadcasted successfully.',
      ...result
    });
  } catch (err) {
    console.error('[Announcements] Admin create error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to dispatch admin announcement' });
  }
});

// PUT /api/announcements/:id/status - Update announcement status (ACTIVE / ARCHIVED)
router.put('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    const updated = db.updateAnnouncement(req.params.id, { status });
    if (!updated) return res.status(404).json({ success: false, message: 'Announcement not found' });

    res.json({ success: true, announcement: updated });
  } catch (err) {
    console.error('[Announcements] Update status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', (req, res) => {
  try {
    const deleted = db.deleteAnnouncement(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Announcement not found' });

    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error('[Announcements] Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
});

module.exports = router;
