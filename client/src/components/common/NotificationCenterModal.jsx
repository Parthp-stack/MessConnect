import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Bell, CheckCheck, Trash2, X, AlertCircle, Utensils,
  CreditCard, Calendar, Megaphone, ShieldAlert, CheckCircle2,
  Clock, Filter
} from 'lucide-react';

export const NotificationCenterModal = ({
  isOpen,
  onClose,
  currentUserId,
  userRole = 'CUSTOMER',
  onNotificationUpdate
}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'READ'
  const [breakdown, setBreakdown] = useState({});
  const [unreadTotal, setUnreadTotal] = useState(0);

  const fetchNotifications = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const res = await api.getNotifications(currentUserId, {
        type: activeCategory,
        status: statusFilter
      });
      if (res && res.success) {
        setNotifications(res.notifications || []);
        setUnreadTotal(res.unreadCount || 0);
        if (res.breakdown) setBreakdown(res.breakdown);
      }
    } catch (err) {
      console.warn('[NotificationCenter] Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, currentUserId, activeCategory, statusFilter]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadTotal(prev => Math.max(0, prev - 1));
      if (onNotificationUpdate) onNotificationUpdate();
    } catch (err) {
      console.warn('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead(currentUserId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadTotal(0);
      if (onNotificationUpdate) onNotificationUpdate();
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (onNotificationUpdate) onNotificationUpdate();
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
  };

  if (!isOpen) return null;

  const getCategoryIcon = (type = '') => {
    switch (type.toUpperCase()) {
      case 'ATTENDANCE':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'PAYMENT':
        return <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'SUBSCRIPTION':
        return <Calendar className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'MENU':
        return <Utensils className="w-4 h-4 text-orange-600 shrink-0" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-4 h-4 text-rose-600 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600 shrink-0" />;
    }
  };

  const categories = [
    { key: 'ALL', label: 'All Alerts', count: unreadTotal },
    { key: 'ATTENDANCE', label: 'Attendance', count: breakdown.ATTENDANCE || 0 },
    { key: 'PAYMENT', label: 'Payments', count: breakdown.PAYMENT || 0 },
    { key: 'SUBSCRIPTION', label: 'Subscriptions', count: breakdown.SUBSCRIPTION || 0 },
    { key: 'MENU', label: 'Menu Updates', count: breakdown.MENU || 0 },
    { key: 'ANNOUNCEMENT', label: 'Announcements', count: breakdown.ANNOUNCEMENT || 0 },
    { key: 'SYSTEM', label: 'System', count: breakdown.SYSTEM || 0 }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Notification Center</h3>
                {unreadTotal > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white font-black text-[10px]">
                    {unreadTotal} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Real-time alerts, meal updates & announcements</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadTotal > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-slate-600 hover:text-orange-600 px-2 py-1 rounded-lg hover:bg-slate-200/50 transition flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-4 py-2 border-b border-slate-100 bg-white overflow-x-auto no-scrollbar flex gap-1 shrink-0">
          {categories.map(c => (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeCategory === c.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{c.label}</span>
              {c.count > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeCategory === c.key ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'
                }`}>
                  {c.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Read / Unread Status Filter */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] font-semibold text-slate-500">
            Showing {notifications.length} {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()} notifications
          </span>
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
            {['ALL', 'UNREAD', 'READ'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition ${
                  statusFilter === s ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400 font-medium">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 opacity-40" />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">No notifications found</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {statusFilter === 'UNREAD' ? 'You have read all your alerts.' : 'No alerts in this category.'}
                </p>
              </div>
            </div>
          ) : (
            notifications.map(notif => {
              const isUnread = !notif.read;
              const formattedTime = notif.timestamp || notif.createdAt
                ? new Date(notif.timestamp || notif.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'short'
                  })
                : notif.time || 'Recently';

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-2xl border transition relative group ${
                    isUnread
                      ? 'bg-orange-50/40 border-orange-200/90 shadow-2xs'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getCategoryIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-xs">
                          {notif.title}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0"></span>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto shrink-0 font-medium">
                          {formattedTime}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words font-medium">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold uppercase">
                          {notif.type || 'SYSTEM'}
                        </span>
                        {notif.channel && (
                          <span className="text-slate-400">
                            • {notif.channel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    {isUnread && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-1 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600 transition"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="p-1 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
