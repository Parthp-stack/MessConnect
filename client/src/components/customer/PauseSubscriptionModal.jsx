import React, { useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Calendar, Clock, AlertCircle, X, Pause, Check } from 'lucide-react';

export const PauseSubscriptionModal = ({
  subscription,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showToast } = useNotification();
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState('Visiting hometown for holidays');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !subscription) return null;

  // Calculate days difference
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.max(0, end - start);
  const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const currentRemaining = subscription.remainingDays || 15;
  const newRemainingDays = Math.max(0, currentRemaining - daysCount);

  const handlePause = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.pauseSubscription(subscription.id, {
        startDate,
        endDate,
        reason,
        daysCount
      });

      if (res && res.success) {
        showToast(`Subscription paused for ${daysCount} days. Your validity has been extended!`, 'success', '⏸️ Meals Paused');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (e) {
      showToast(e.message || 'Failed to pause subscription', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <Pause className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Pause Meal Subscription</h3>
              <p className="text-[10px] text-slate-400">{subscription.messName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Days Calculation Overview (Section 17) */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[10px] text-slate-400">Active Days</div>
            <div className="text-base font-bold text-slate-800">{subscription.activeDays || 15}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
            <div className="text-[10px] text-amber-800 font-semibold">Pause Days</div>
            <div className="text-base font-bold text-amber-900">{daysCount}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="text-[10px] text-emerald-800 font-semibold">Credit Extend</div>
            <div className="text-base font-bold text-emerald-900">+{daysCount}d</div>
          </div>
        </div>

        <form onSubmit={handlePause} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Pause From</label>
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Pause To</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Reason for Pause</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Vacation, Exams, Festivals"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-500 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>Policy: Meals are credited as extended days on your monthly pass. No automatic cash refund is provided.</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-2xl transition shadow-lg shadow-amber-600/25 flex items-center justify-center gap-1.5"
          >
            {submitting ? 'Pausing Subscription...' : `Confirm Pause (${daysCount} Days)`}
          </button>
        </form>
      </div>
    </div>
  );
};
