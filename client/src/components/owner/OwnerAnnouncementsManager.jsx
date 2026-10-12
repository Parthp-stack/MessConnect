import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import {
  Megaphone, Send, Clock, Users, CheckCircle2,
  AlertTriangle, Trash2, Archive, Sparkles, Plus, RefreshCw
} from 'lucide-react';

export const OwnerAnnouncementsManager = ({ messId, messName }) => {
  const { showToast } = useNotification();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('MESS_STUDENTS');

  const PRESETS = [
    { title: "Today's lunch starts at 1 PM", msg: "Today's hot lunch service will begin at 1:00 PM due to special preparation." },
    { title: "Mess will remain closed tomorrow", msg: "Mess dining operations will remain closed tomorrow for monthly maintenance and sanitization." },
    { title: "Special dinner tonight", msg: "Special festive dinner menu tonight featuring hot Puran Poli, Dal Tadka, and Shrikhand from 7:30 PM." },
    { title: "Breakfast timings adjusted", msg: "Breakfast serving timings have been adjusted to 8:00 AM - 10:30 AM starting from tomorrow." }
  ];

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.getAnnouncements({ status: 'ALL' });
      if (res && res.success) {
        setAnnouncements(res.announcements || []);
      }
    } catch (err) {
      console.warn('[OwnerAnnouncements] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [messId]);

  const handleApplyPreset = (p) => {
    setTitle(p.title);
    setMessage(p.msg);
  };

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Please provide both title and message for the announcement', 'warning');
      return;
    }

    setSending(true);
    try {
      const res = await api.createOwnerAnnouncement({
        messId,
        title: title.trim(),
        message: message.trim(),
        target
      });

      if (res && res.success) {
        showToast(
          `Announcement sent to ${res.recipientsCount || 'all'} students!`,
          'success',
          '📢 Broadcast Sent'
        );
        setTitle('');
        setMessage('');
        fetchAnnouncements();
      }
    } catch (err) {
      showToast(err.message || 'Failed to send announcement', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    try {
      await api.updateAnnouncementStatus(id, nextStatus);
      showToast(`Announcement marked as ${nextStatus}`, 'info');
      fetchAnnouncements();
    } catch (err) {
      showToast('Could not update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement permanently?')) return;
    try {
      await api.deleteAnnouncement(id);
      showToast('Announcement deleted', 'info');
      fetchAnnouncements();
    } catch (err) {
      showToast('Could not delete announcement', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black">Student Broadcasts & Announcements</h2>
              <p className="text-xs text-orange-100 mt-0.5">
                Send real-time updates directly to your enrolled students' phones and notification centers
              </p>
            </div>
          </div>

          <button
            onClick={fetchAnnouncements}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 2. Compose Announcement Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-orange-600" />
              <span>Compose New Announcement</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
              Live Broadcast
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-[11px] font-semibold transition border border-slate-200/60 text-left"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendAnnouncement} className="space-y-3.5 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Announcement Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Special Dinner Tonight / Lunch delay"
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Detailed Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder="Write the full message for your students..."
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Target Audience
              </label>
              <select
                value={target}
                onChange={e => setTarget(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium bg-white"
              >
                <option value="MESS_STUDENTS">All Subscribed Students ({messName || 'My Mess'})</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={sending || !title.trim() || !message.trim()}
              className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-orange-600/20 transition flex items-center justify-center gap-2 mt-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Dispatching Broadcast...' : 'Broadcast to All Students'}</span>
            </button>
          </form>
        </div>

        {/* 3. Dispatched Announcements History */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Dispatched Announcements</h3>
              <p className="text-[11px] text-slate-500">History of communications delivered to students</p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Total: {announcements.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">Loading broadcasts...</div>
            ) : announcements.length === 0 ? (
              <div className="py-16 text-center space-y-2 text-slate-400">
                <Megaphone className="w-8 h-8 opacity-40 mx-auto" />
                <p className="text-xs font-medium">No announcements published yet.</p>
                <p className="text-[11px]">Compose an announcement to notify your students.</p>
              </div>
            ) : (
              announcements.map(ann => {
                const isArchived = ann.status === 'ARCHIVED';
                const formattedDate = ann.createdAt
                  ? new Date(ann.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Recently';

                return (
                  <div
                    key={ann.id}
                    className={`p-4 rounded-2xl border transition space-y-2.5 ${
                      isArchived
                        ? 'bg-slate-50/70 border-slate-200/60 opacity-80'
                        : 'bg-white border-slate-200 hover:border-orange-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            {ann.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            isArchived
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {ann.status || 'Active'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>Delivered: {formattedDate}</span>
                          <span>• Target: {ann.target === 'MESS_STUDENTS' ? 'Mess Students' : ann.target}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(ann.id, ann.status)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                          title={isArchived ? 'Activate' : 'Archive'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{ann.message}"
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
