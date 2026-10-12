// Web Notifications & Local Reminder Scheduler
import { storage } from './storage';

class NotificationService {
  constructor() {
    this.hasSupport = typeof window !== 'undefined' && 'Notification' in window;
  }

  getPermissionState() {
    if (!this.hasSupport) return 'unsupported';
    return Notification.permission; // 'default', 'granted', 'denied'
  }

  async requestPermission() {
    if (!this.hasSupport) return 'unsupported';
    try {
      const permission = await Notification.requestPermission();
      storage.setPreference('notification_permission', permission);
      return permission;
    } catch (e) {
      console.warn('[Notification] Permission request failed:', e);
      return 'denied';
    }
  }

  notify(title, options = {}) {
    const prefs = storage.getPreference('notification_settings', {
      meals: true,
      subscriptions: true,
      offers: true,
      trials: true
    });

    const category = options.channel?.toLowerCase() || 'general';
    if (prefs[category] === false) {
      console.log(`[Notification] Suppressed due to category preference: ${category}`);
      return null;
    }

    // Try native browser notification if granted
    if (this.hasSupport && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: options.body || options.message,
          icon: options.icon || '/favicon.ico',
          badge: '/favicon.ico',
          ...options
        });
        return notif;
      } catch (e) {
        console.warn('[Notification] Native display error:', e);
      }
    }

    return null;
  }

  // Section 12: Local Scheduled Reminder Simulation
  simulateMealReminder(messName = "your subscribed mess", meal = "Breakfast") {
    return this.notify(`🍽️ ${meal} Reminder`, {
      channel: 'meals',
      body: `Your hot ${meal} is now ready at ${messName}. Don't miss today's specials!`,
      tag: 'meal_reminder'
    });
  }

  simulateExpiryReminder(days = 3, messName = "your subscribed mess") {
    return this.notify(`⚠️ Subscription Expiring Soon`, {
      channel: 'subscriptions',
      body: `Your mess subscription at ${messName} expires in ${days} days. Renew now to avoid interruption.`,
      tag: 'sub_expiry'
    });
  }
}

export const notificationService = new NotificationService();
