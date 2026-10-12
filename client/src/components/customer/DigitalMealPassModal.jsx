import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  QrCode, Clock, ShieldCheck, CheckCircle2, AlertTriangle,
  PauseCircle, Share2, Sparkles, X, RefreshCw, Send, ArrowRight
} from 'lucide-react';

export const DigitalMealPassModal = ({ isOpen, onClose, messId, onSwitchToOwnerScanner }) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotification();

  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftName, setGiftName] = useState('');
  const [giftPhone, setGiftPhone] = useState('');
  const [gifting, setGifting] = useState(false);
  const [giftResult, setGiftResult] = useState(null);
  const [liveSeconds, setLiveSeconds] = useState(30);

  const fetchPass = async () => {
    setLoading(true);
    try {
      if (!currentUser?.id) {
        setPassData(null);
        setLoading(false);
        return;
      }
      const res = await api.getStudentPass(currentUser.id, messId);
      if (res && res.pass) {
        setPassData(res.pass);
      } else {
        setPassData(null);
      }
    } catch (e) {
      console.warn('[DigitalMealPassModal] Error:', e);
      setPassData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPass();
      setGiftResult(null);
    }
  }, [isOpen, messId]);

  // Anti-screenshot 30-second live token timer
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setLiveSeconds(prev => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGiftMeal = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setGifting(true);
    try {
      // Find user's group or generate standalone gift
      const groupRes = await api.getUserGroup(currentUser.id);
      const groupId = groupRes?.group?.id;
      if (!groupId) {
        showToast('You must be in a roommate pod to gift passes', 'error');
        return;
      }

      const res = await api.giftMealPass(groupId, {
        fromUserId: currentUser.id,
        toName: giftName,
        toPhone: giftPhone,
        mealType: passData?.mealType || 'Lunch',
        message: 'Hot meal transferred via MessConnect Buddy Pass'
      });

      if (res && res.gift) {
        setGiftResult(res.gift);
        showToast(`Buddy Pass sent to ${giftName}! Secret PIN: ${res.gift.giftPin}`, 'success', '🎁 Meal Gifted');
      }
    } catch (e) {
      showToast('Failed to gift meal pass', 'error');
    } finally {
      setGifting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Top Header Card */}
        <div className="p-5 pb-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Anti-Proxy Meal Pass
            </span>
          </div>

          <h2 className="text-lg font-extrabold text-white">
            {passData?.mealType ? `${passData.mealType} Pass` : 'Digital Meal Pass'}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
            {passData?.messName || 'Your Enrolled Mess'}
          </p>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>{passData?.mealWindow || 'Meal Session Window'}</span>
            </div>
            <div className="text-[11px] font-semibold text-emerald-400">
              {passData?.planName || ''}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-orange-500" />
              <p className="text-xs">Checking meal pass...</p>
            </div>
          ) : !passData ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-800 text-sm">No Active Meal Pass</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                You do not have an active subscription or flexipass for this mess today. Subscribe to any verified mess to activate your pass.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-xs"
              >
                Explore Messes
              </button>
            </div>
          ) : (
            <>
              {/* QR & Security Frame */}
              <div className="relative p-5 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-3 shadow-inner">
                
                {/* Status Indicator */}
                <div className="flex justify-center">
                  {passData?.status === 'CONSUMED' ? (
                    <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Plate Served at {passData.consumedAt || 'Today'}
                    </span>
                  ) : passData?.status === 'PAUSED' ? (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5">
                      <PauseCircle className="w-4 h-4 text-amber-600" />
                      Meals Paused on Vacation
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Ready to Dine • Present at Counter
                    </span>
                  )}
                </div>

                {/* SVG QR Code Simulation */}
                <div className="relative mx-auto w-44 h-44 bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden group">
                  {passData?.status === 'CONSUMED' && (
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white z-10">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-1" />
                      <span className="font-extrabold text-sm tracking-wider uppercase">Consumed</span>
                      <span className="text-[10px] text-slate-300">{passData.consumedAt}</span>
                    </div>
                  )}

                  {/* Clean SVG QR Pattern Representation */}
                  <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                    {/* Top-Left Finder */}
                    <rect x="5" y="5" width="26" height="26" rx="4" fill="currentColor" />
                    <rect x="9" y="9" width="18" height="18" rx="2" fill="white" />
                    <rect x="13" y="13" width="10" height="10" rx="1" fill="currentColor" />

                    {/* Top-Right Finder */}
                    <rect x="69" y="5" width="26" height="26" rx="4" fill="currentColor" />
                    <rect x="73" y="9" width="18" height="18" rx="2" fill="white" />
                    <rect x="77" y="13" width="10" height="10" rx="1" fill="currentColor" />

                    {/* Bottom-Left Finder */}
                    <rect x="5" y="69" width="26" height="26" rx="4" fill="currentColor" />
                    <rect x="9" y="73" width="18" height="18" rx="2" fill="white" />
                    <rect x="13" y="77" width="10" height="10" rx="1" fill="currentColor" />

                    {/* Dynamic Data Modules Matrix */}
                    <rect x="36" y="8" width="6" height="6" rx="1" fill="currentColor" />
                    <rect x="46" y="8" width="8" height="6" rx="1" fill="currentColor" />
                    <rect x="58" y="12" width="6" height="6" rx="1" fill="currentColor" />
                    <rect x="36" y="20" width="8" height="6" rx="1" fill="currentColor" />
                    <rect x="48" y="20" width="6" height="6" rx="1" fill="currentColor" />

                    <rect x="8" y="36" width="6" height="6" rx="1" fill="currentColor" />
                    <rect x="20" y="36" width="6" height="6" rx="1" fill="currentColor" />
                    <rect x="8" y="48" width="8" height="6" rx="1" fill="currentColor" />
                    <rect x="20" y="48" width="6" height="6" rx="1" fill="currentColor" />

                    <rect x="36" y="36" width="28" height="28" rx="6" fill="#ea580c" />
                    <text x="50" y="54" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">MC</text>

                    <rect x="68" y="36" width="8" height="6" rx="1" fill="currentColor" />
                    <rect x="80" y="36" width="6" height="6" rx="1" fill="currentColor" />
                    <rect x="68" y="48" width="6" height="6" rx="1" fill="currentColor" />
                    <rect x="80" y="48" width="8" height="6" rx="1" fill="currentColor" />

                    <rect x="36" y="68" width="6" height="8" rx="1" fill="currentColor" />
                    <rect x="48" y="68" width="8" height="6" rx="1" fill="currentColor" />
                    <rect x="60" y="68" width="6" height="8" rx="1" fill="currentColor" />
                    <rect x="36" y="80" width="8" height="6" rx="1" fill="currentColor" />
                    <rect x="48" y="80" width="6" height="8" rx="1" fill="currentColor" />
                    <rect x="60" y="80" width="8" height="6" rx="1" fill="currentColor" />
                    <rect x="74" y="74" width="16" height="16" rx="2" fill="currentColor" />
                  </svg>

                  {/* Animated laser radar line */}
                  {passData?.status === 'READY_TO_SCAN' && (
                    <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse shadow-sm"></div>
                  )}
                </div>

                {/* 4-Digit Anti-Proxy Token */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                    4-Digit Verbal Dining PIN
                  </div>
                  <div className="font-mono text-3xl font-black text-slate-900 tracking-widest bg-white py-1.5 px-4 rounded-xl border border-slate-200 inline-block shadow-xs">
                    {passData?.token4Digit || '----'}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tell this 4-digit code to the kitchen staff if camera scan is unavailable.
                  </p>
                </div>

                {/* Anti-screenshot moving security hash */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                  <span>HASH: {passData?.securityHash || '----'}</span>
                  <span className="text-orange-600 font-bold">Refresh: {liveSeconds}s</span>
                </div>
              </div>

              {/* Student Pass Details Card */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900">{passData?.userName || currentUser?.name || 'Student'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Mess Location:</span>
                  <span className="font-bold text-slate-900">{passData?.messName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Date & Session:</span>
                  <span className="font-semibold text-slate-700">{passData?.date} • {passData?.mealType}</span>
                </div>
                {passData?.isFlexiPass && (
                  <div className="flex items-center justify-between text-indigo-600 font-semibold pt-1 border-t border-slate-100">
                    <span>FlexiPass Balance:</span>
                    <span>{passData?.flexipassCredits} meals left</span>
                  </div>
                )}
              </div>

              {/* Gift / Transfer Button */}
              {passData?.status === 'READY_TO_SCAN' && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowGiftModal(!showGiftModal)}
                    className="w-full py-2.5 rounded-2xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/50 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Gift Today's Meal to Roommate / Friend</span>
                  </button>

                  {/* Gift Drawer Form */}
                  {showGiftModal && (
                    <form onSubmit={handleGiftMeal} className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3 text-xs animate-in fade-in duration-150">
                      <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>MessConnect Buddy Pass Transfer</span>
                      </div>
                      <p className="text-[11px] text-indigo-700 leading-tight">
                        Skipping {passData?.mealType}? Transfer your plate pass to your hostel roommate or a friend for today.
                      </p>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Friend's Name</label>
                        <input
                          type="text"
                          required
                          value={giftName}
                          onChange={e => setGiftName(e.target.value)}
                          placeholder="Friend's Full Name"
                          className="w-full p-2 bg-white rounded-xl border border-indigo-200 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Friend's Phone / WhatsApp</label>
                        <input
                          type="tel"
                          required
                          value={giftPhone}
                          onChange={e => setGiftPhone(e.target.value)}
                          placeholder="10-digit mobile number"
                          className="w-full p-2 bg-white rounded-xl border border-indigo-200 text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={gifting}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{gifting ? 'Generating Pass...' : 'Generate & Send Buddy Pass'}</span>
                      </button>

                      {giftResult && (
                        <div className="p-3 bg-white rounded-xl border border-emerald-300 text-emerald-900 text-xs space-y-1">
                          <div className="font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Buddy Pass Created!
                          </div>
                          <p className="text-[11px]">Give this PIN to {giftResult.toName}:</p>
                          <div className="text-lg font-mono font-black text-emerald-700">{giftResult.giftPin}</div>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* Quick Test Action: Switch to Mess Owner Scanner */}
              {onSwitchToOwnerScanner && passData?.token4Digit && (
                <button
                  onClick={() => {
                    onClose();
                    onSwitchToOwnerScanner(passData.token4Digit);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Test in Owner Pass Scanner</span>
                  <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Security Protocol 4.2</span>
          <button
            onClick={fetchPass}
            className="flex items-center gap-1 text-orange-600 font-semibold hover:underline"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
