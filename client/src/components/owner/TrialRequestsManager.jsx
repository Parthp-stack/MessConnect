import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Utensils, Check, X, Clock, Calendar, UserCheck } from 'lucide-react';

export const TrialRequestsManager = ({ messId }) => {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  const fetchTrials = async () => {
    if (!messId) {
      setTrials([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getTrials(null, messId);
      if (res && res.trials) {
        setTrials(res.trials);
      } else {
        setTrials([]);
      }
    } catch (e) {
      console.warn('[TrialRequests] Error fetching:', e);
      setTrials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrials();
  }, [messId]);

  const handleUpdateStatus = async (trialId, status) => {
    try {
      const res = await api.updateTrialStatus(trialId, status);
      if (res && res.success) {
        showToast(
          status === 'APPROVED' ? 'Trial approved and confirmed!' : 'Trial request declined.',
          status === 'APPROVED' ? 'success' : 'info'
        );
        fetchTrials();
      }
    } catch (e) {
      showToast('Failed to update trial status', 'error');
    }
  };

  const pending = trials.filter(t => t.status === 'PENDING');

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Trial Meal Requests</h3>
          <p className="text-[10px] text-slate-500">Approve or decline upcoming visits</p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px]">
          {pending.length} Pending
        </span>
      </div>

      {trials.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-400">No trial bookings at the moment.</div>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {trials.map(trial => (
            <div
              key={trial.id}
              className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{trial.userName}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                    {trial.mealType}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>📅 {trial.date}</span>
                  <span>•</span>
                  <span className="font-semibold text-emerald-700">₹{trial.price} Paid</span>
                </div>
              </div>

              <div>
                {trial.status === 'PENDING' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleUpdateStatus(trial.id, 'APPROVED')}
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                      title="Approve trial"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(trial.id, 'REJECTED')}
                      className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 transition"
                      title="Decline trial"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      trial.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {trial.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
