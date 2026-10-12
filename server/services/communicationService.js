const db = require('../db/database');
const { sendEmail } = require('./emailService');

class CommunicationService {
  constructor() {
    this.smsLog = [];
    this.pushLog = [];
  }

  /**
   * Dispatches an in-app notification with optional channels
   */
  async sendNotification({
    userId,
    title,
    message,
    type = 'SYSTEM',
    channel = 'System',
    data = {},
    sendEmailAlert = false,
    sendSmsAlert = false
  }) {
    if (!userId && !data.broadcast) return null;

    const notif = db.createNotification({
      userId,
      title,
      message,
      type: type.toUpperCase(), // ATTENDANCE, PAYMENT, SUBSCRIPTION, MENU, ANNOUNCEMENT, SYSTEM
      channel,
      data,
      read: false,
      createdAt: new Date().toISOString()
    });

    // Email dispatch fallback
    if (sendEmailAlert && userId) {
      const user = db.getUserById(userId);
      if (user && user.email) {
        sendEmail({
          to: user.email,
          subject: title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
              <h2 style="color: #ea580c; margin-bottom: 12px;">MessConnect Notification</h2>
              <h3 style="color: #0f172a; margin-top: 0;">${title}</h3>
              <p style="color: #334155; line-height: 1.6; font-size: 15px;">${message}</p>
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                Find. Subscribe. Eat. Simplify. — MessConnect Campus Platform
              </div>
            </div>
          `
        }).catch(err => console.warn('[CommunicationService] Email alert error:', err.message));
      }
    }

    // Modular SMS adapter hook
    if (sendSmsAlert && userId) {
      const user = db.getUserById(userId);
      if (user && user.phone) {
        this.smsLog.push({
          phone: user.phone,
          message: `${title}: ${message}`,
          timestamp: new Date().toISOString()
        });
        console.log(`📱 [SMS Gateway Stub] Dispatched to ${user.phone}: "${title} - ${message}"`);
      }
    }

    return notif;
  }

  /**
   * Dispatches targeted announcements across users
   */
  async dispatchAnnouncement({
    title,
    message,
    target = 'ALL_STUDENTS', // ALL_STUDENTS | ALL_OWNERS | MESS_STUDENTS | SPECIFIC_USER | SPECIFIC_GROUP
    targetId = null,
    targetName = null,
    createdById,
    createdByName,
    createdByRole = 'ADMIN',
    messId = null
  }) {
    // 1. Save announcement record
    const announcement = db.createAnnouncement({
      title,
      message,
      target,
      targetId,
      targetName,
      createdById,
      createdByName,
      createdByRole,
      messId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    });

    // 2. Identify target recipient user IDs
    const recipients = new Set();
    const allUsers = db.getUsers();

    if (target === 'ALL_STUDENTS') {
      allUsers.filter(u => u.role === 'CUSTOMER').forEach(u => recipients.add(u.id));
    } else if (target === 'ALL_OWNERS') {
      allUsers.filter(u => u.role === 'OWNER').forEach(u => recipients.add(u.id));
    } else if (target === 'MESS_STUDENTS' || target === 'SPECIFIC_MESS') {
      const targetMessId = targetId || messId;
      if (targetMessId) {
        // Active and past subscribers of this mess
        const subs = db.getMessSubscriptions(targetMessId);
        subs.forEach(s => recipients.add(s.userId));
      }
    } else if (target === 'SPECIFIC_USER' && targetId) {
      recipients.add(targetId);
    } else if (target === 'SPECIFIC_GROUP' && targetId) {
      const groups = db.data.groups || [];
      const grp = groups.find(g => g.id === targetId);
      if (grp && Array.isArray(grp.members)) {
        grp.members.forEach(m => {
          if (m.userId) recipients.add(m.userId);
        });
      }
    }

    // 3. Dispatch in-app notifications to recipients
    const recipientIds = Array.from(recipients);
    for (const recipientId of recipientIds) {
      await this.sendNotification({
        userId: recipientId,
        title: `📢 ${title}`,
        message,
        type: 'ANNOUNCEMENT',
        channel: 'Announcements',
        data: {
          announcementId: announcement.id,
          target,
          createdByName,
          createdByRole
        },
        sendEmailAlert: false
      });
    }

    console.log(`📢 [Announcement] Dispatched "${title}" to ${recipientIds.length} recipients (Target: ${target})`);
    return {
      success: true,
      announcement,
      recipientsCount: recipientIds.length
    };
  }

  /**
   * Attendance event notification
   */
  async notifyAttendance({
    studentId,
    studentName,
    messId,
    messName,
    sessionType,
    status = 'PRESENT',
    markedAt = 'Just now'
  }) {
    if (!studentId) return;

    const title = status === 'PRESENT'
      ? `✅ ${sessionType} Attendance Marked`
      : `⚠️ ${sessionType} Attendance: Absent`;

    const message = status === 'PRESENT'
      ? `Your ${sessionType} attendance at ${messName || 'Mess'} was marked successfully at ${markedAt}. Enjoy your meal!`
      : `You were marked absent for ${sessionType} at ${messName || 'Mess'}.`;

    return this.sendNotification({
      userId: studentId,
      title,
      message,
      type: 'ATTENDANCE',
      channel: 'Attendance',
      data: { messId, sessionType, status, markedAt }
    });
  }

  /**
   * Payment transaction notification
   */
  async notifyPayment({
    studentId,
    amount,
    status = 'SUCCESS',
    planName = 'Meal Plan',
    receiptNumber = '',
    messName = ''
  }) {
    if (!studentId) return;

    const isSuccess = status === 'SUCCESS';
    const title = isSuccess ? '💳 Payment Successful' : '⚠️ Payment Failed';
    const message = isSuccess
      ? `Payment of ₹${Number(amount).toLocaleString('en-IN')} for ${planName} at ${messName || 'Mess'} was confirmed. Receipt: ${receiptNumber || 'Confirmed'}.`
      : `Your payment of ₹${Number(amount).toLocaleString('en-IN')} for ${planName} could not be processed. Please try again.`;

    return this.sendNotification({
      userId: studentId,
      title,
      message,
      type: 'PAYMENT',
      channel: 'Billing',
      data: { amount, status, planName, receiptNumber, messName },
      sendEmailAlert: isSuccess
    });
  }

  /**
   * Subscription lifecycle alert
   */
  async notifySubscription({
    studentId,
    eventType = 'EXPIRY_WARNING', // ACTIVATED | EXPIRY_WARNING | EXPIRED | RENEWED
    messName,
    planName,
    daysRemaining = 0,
    expiryDate = ''
  }) {
    if (!studentId) return;

    let title = '🔔 Subscription Update';
    let message = '';

    if (eventType === 'EXPIRY_WARNING') {
      title = `⚠️ Subscription Expiring in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`;
      message = `Your ${planName || 'mess subscription'} at ${messName || 'Mess'} expires on ${expiryDate || 'soon'}. Renew now to avoid meal disruption.`;
    } else if (eventType === 'EXPIRED') {
      title = '❌ Subscription Expired';
      message = `Your dining subscription at ${messName || 'Mess'} has expired. Tap to renew your meal pass today.`;
    } else if (eventType === 'ACTIVATED') {
      title = '🎉 Subscription Activated';
      message = `Welcome! Your ${planName || 'Dining Plan'} at ${messName || 'Mess'} is active. Your QR meal pass is ready.`;
    } else if (eventType === 'RENEWED') {
      title = '🔄 Subscription Renewed';
      message = `Your ${planName || 'Dining Plan'} at ${messName || 'Mess'} has been renewed successfully. Valid until ${expiryDate}.`;
    }

    return this.sendNotification({
      userId: studentId,
      title,
      message,
      type: 'SUBSCRIPTION',
      channel: 'Subscriptions',
      data: { eventType, messName, planName, daysRemaining, expiryDate },
      sendEmailAlert: eventType === 'EXPIRY_WARNING' || eventType === 'ACTIVATED'
    });
  }

  /**
   * Menu update notification to subscribers
   */
  async notifyMenuUpdate({
    messId,
    messName,
    sessionType = 'Today',
    menuText = ''
  }) {
    if (!messId) return;

    // Retrieve active subscribers of this mess
    const subs = db.getMessSubscriptions(messId).filter(s => s.status === 'ACTIVE');
    const subscriberUserIds = Array.from(new Set(subs.map(s => s.userId)));

    const title = `🍽️ Menu Updated: ${messName}`;
    const message = `${messName} published the menu for ${sessionType}: ${menuText.substring(0, 100)}${menuText.length > 100 ? '...' : ''}`;

    for (const userId of subscriberUserIds) {
      await this.sendNotification({
        userId,
        title,
        message,
        type: 'MENU',
        channel: 'Meals',
        data: { messId, sessionType, menuText }
      });
    }

    return { success: true, notifiedCount: subscriberUserIds.length };
  }
}

const communicationService = new CommunicationService();
module.exports = communicationService;
