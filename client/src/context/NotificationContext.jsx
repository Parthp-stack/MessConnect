import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { notificationService } from '../services/notifications';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [permissionState, setPermissionState] = useState(() => notificationService.getPermissionState());
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.getNotifications(currentUser.id);
      if (res && res.notifications) {
        const filtered = res.notifications.filter(n => !n.title?.toLowerCase().includes('maintenance') && !n.message?.toLowerCase().includes('maintenance'));
        setNotifications(filtered);
        setUnreadCount(res.unreadCount !== undefined ? filtered.filter(n => !n.read).length : filtered.filter(n => !n.read).length);
      }
    } catch (e) {
      console.warn('[NotificationContext] Failed to fetch notifications:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Show Toast
  const showToast = (message, type = 'info', title = null) => {
    const id = Date.now();
    const newToast = { id, message, type, title };
    setToasts(prev => [...prev, newToast]);

    // Play native notification if allowed
    if (title) {
      notificationService.notify(title, { body: message });
    }

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Mark Read
  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await api.markNotificationRead(id).catch(() => {});
  };

  // Mark All Read
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    if (currentUser) {
      await api.markAllNotificationsRead(currentUser.id).catch(() => {});
    }
  };

  // Request native permission
  const requestPermission = async () => {
    const result = await notificationService.requestPermission();
    setPermissionState(result);
    setShowPermissionPrompt(false);
    if (result === 'granted') {
      showToast('Notifications enabled! You will now receive hot meal and expiry alerts.', 'success', '🔔 Alerts Activated');
    }
    return result;
  };

  // Simulate local reminders (Section 12)
  const triggerBreakfastReminder = (messName = 'Your Mess') => {
    notificationService.simulateMealReminder(messName);
    showToast(`Hot breakfast is being served at ${messName} until 10:00 AM.`, 'info', '🍽️ Breakfast Reminder');
    loadNotifications();
  };

  const triggerExpiryReminder = (messName = 'Your Mess') => {
    notificationService.simulateExpiryReminder(3, messName);
    showToast(`Your mess subscription at ${messName} expires in 3 days. Renew now to avoid interruption.`, 'warning', '⚠️ Subscription Expiring');
    loadNotifications();
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      toasts,
      showToast,
      markRead,
      markAllRead,
      permissionState,
      showPermissionPrompt,
      setShowPermissionPrompt,
      requestPermission,
      triggerBreakfastReminder,
      triggerExpiryReminder,
      loadNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
