import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Utensils, Calendar, Clock, AlertCircle, X, ArrowRight } from 'lucide-react';

export const TrialBookingModal = ({
  mess,
  isOpen,
  onClose,
  onProceedToPayment
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotification();
  const [mealType, setMealType] = useState('Lunch');
  const [trialDate, setTrialDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [dietaryNote, setDietaryNote] = useState('');

  if (!isOpen || !mess) return null;

  const handleProceed = () => {
    onProceedToPayment({
      messId: mess.id,
      messName: mess.name,
      mealType,
      date: trialDate,
      amount: mess.trialPrice || 70,
      title: `Trial Meal: ${mealType}`,
      subtitle: `${mess.name} • ${trialDate}`,
      actionType: 'TRIAL'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Book a Trial Meal</h3>
            <p className="text-[11px] text-slate-500">{mess.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Price Card */}
        <div className="bg-orange-50 rounded-2xl p-3.5 mb-4 flex items-center justify-between border border-orange-100">
          <div>
            <span className="text-[11px] font-semibold text-orange-800">One-Time Trial Fee</span>
            <div className="text-xl font-extrabold text-orange-600">₹{mess.trialPrice || 70}</div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-orange-200/70 text-orange-900 font-semibold">
            Refundable if Rejected
          </span>
        </div>

        {/* Meal Type Selector */}
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">Choose Meal</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { type: 'Breakfast', icon: '🍳', time: '8:00 AM' },
              { type: 'Lunch', icon: '🍛', time: '1:00 PM' },
              { type: 'Dinner', icon: '🌙', time: '8:00 PM' }
            ].map(m => (
              <button
                key={m.type}
                type="button"
                onClick={() => setMealType(m.type)}
                className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                  mealType === m.type
                    ? 'border-orange-500 bg-orange-50/70 text-orange-900 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-base">{m.icon}</span>
                <span className="text-xs">{m.type}</span>
                <span className="text-[9px] text-slate-400 font-normal">{m.time}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Picker */}
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Date</label>
          <input
            type="date"
            value={trialDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setTrialDate(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {/* Abuse Prevention Notice (Section 18) */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-500 flex items-start gap-2 mb-5">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>Trial is restricted to 1 meal per mess per student. The mess owner will verify and approve before serving.</span>
        </div>

        <button
          onClick={handleProceed}
          className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-2xl transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
        >
          <span>Continue to Mock Payment (₹{mess.trialPrice || 70})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
