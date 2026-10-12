import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { sounds } from '../../utils/soundEffects';
import { useNotification } from '../../context/NotificationContext';
import {
  ScanLine, QrCode, Hash, CheckCircle2, AlertTriangle, XCircle,
  Clock, ShieldAlert, Sparkles, User, RefreshCw, Volume2, Zap
} from 'lucide-react';

export const MealPassScanner = ({ messId, initialToken = '' }) => {
  const { showToast } = useNotification();

  const [inputToken, setInputToken] = useState(initialToken);
  const [activeMode, setActiveMode] = useState('camera'); // 'camera' or 'keypad'
  const [verifying, setVerifying] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [flashOn, setFlashOn] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState('Lunch');

  const fetchHistory = async () => {
    if (!messId) {
      setHistory([]);
      return;
    }
    try {
      const res = await api.getCheckinHistory(messId);
      if (res && res.checkins) {
        setHistory(res.checkins);
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.warn('[MealPassScanner] Failed to fetch checkins:', e);
      setHistory([]);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [messId]);

  useEffect(() => {
    if (initialToken) {
      setInputToken(initialToken);
      handleVerify(initialToken, 'TOKEN_ENTRY');
    }
  }, [initialToken]);

  const handleVerify = async (tokenToVerify, method = 'QR_SCAN') => {
    const token = tokenToVerify || inputToken;
    if (!token) {
      showToast('Please enter a 4-digit token or scan QR', 'error');
      return;
    }

    setVerifying(true);
    try {
      const res = await api.verifyPass({
        token,
        messId: messId,
        mealType: selectedMeal,
        method
      });

      setLastResult(res);

      if (res.valid) {
        sounds.playEntranceChime();
        showToast(`Plate Authorized! ${res.studentName} verified.`, 'success', '🍽️ Pass Verified');
        fetchHistory();
        setInputToken('');
      } else {
        sounds.playWarningBuzzer();
        showToast(res.message || 'Verification Failed', 'error', '⚠️ Access Denied');
      }
    } catch (e) {
      sounds.playWarningBuzzer();
      showToast('Verification server error', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleKeypadPress = (digit) => {
    if (inputToken.length < 4) {
      const next = inputToken + digit;
      setInputToken(next);
      if (next.length === 4) {
        handleVerify(next, 'KEYPAD_ENTRY');
      }
    }
  };

  const handleKeypadDelete = () => {
    setInputToken(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setInputToken('');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Top Controller & Mode Selector */}
      <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <ScanLine className="w-4 h-4 text-orange-600" />
              <span>Dining Entrance Pass Desk</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Anti-proxy validation for enrolled students and FlexiPass diners.
            </p>
          </div>

          {/* Active Meal Session Selector */}
          <select
            value={selectedMeal}
            onChange={e => setSelectedMeal(e.target.value)}
            className="text-xs font-bold bg-orange-50 border border-orange-200 text-orange-900 rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="Breakfast">🌅 Breakfast</option>
            <option value="Lunch">☀️ Lunch</option>
            <option value="Dinner">🌙 Dinner</option>
          </select>
        </div>

        {/* Tab Switcher: Camera Simulator vs Keypad */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setActiveMode('camera')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeMode === 'camera'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-orange-600" />
            <span>Camera Scanner</span>
          </button>
          <button
            onClick={() => setActiveMode('keypad')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeMode === 'keypad'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-indigo-600" />
            <span>4-Digit PIN</span>
          </button>
        </div>
      </div>

      {/* Responsive Dual Pane Layout: Scanner on Left, Live Log on Right on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Camera or Keypad + Result */}
        <div className="lg:col-span-6 space-y-4">
          {/* MODE 1: CAMERA SCANNER SIMULATION */}
          {activeMode === 'camera' && (
            <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-lg space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Scanner Ready
            </span>
            <button
              onClick={() => setFlashOn(!flashOn)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                flashOn ? 'bg-amber-400 text-slate-900 border-amber-300' : 'bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{flashOn ? 'Torch ON' : 'Torch OFF'}</span>
            </button>
          </div>

          {/* Viewfinder simulation box */}
          <div className="relative mx-auto w-56 h-56 rounded-3xl bg-slate-950/80 border-2 border-orange-500/80 flex items-center justify-center overflow-hidden shadow-2xl">
            {/* Crosshairs corner accents */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white"></div>

            {/* Scanning Laser Beam */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_12px_#fb923c] animate-bounce"></div>

            <div className="text-center p-4 space-y-1">
              <QrCode className="w-10 h-10 text-white/30 mx-auto" />
              <p className="text-[10px] text-slate-400">Point at student screen</p>
            </div>
          </div>

          {/* Live Scanner Guide */}
          <div className="space-y-2 pt-2 border-t border-white/10 text-center text-xs text-slate-300">
            <p className="text-[11px] text-slate-400">
              Students display their anti-proxy QR code from their student portal. Or tap <strong className="text-orange-400">4-Digit PIN</strong> above to enter their meal code manually.
            </p>
          </div>
        </div>
      )}

      {/* MODE 2: 4-DIGIT PIN KEYPAD */}
      {activeMode === 'keypad' && (
        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="text-center space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Enter Student 4-Digit Code
            </div>
            <div className="h-14 font-mono text-3xl font-black text-slate-900 tracking-widest flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200">
              {inputToken.padEnd(4, '•')}
            </div>
          </div>

          {/* Numeric Touch Keypad Grid */}
          <div className="grid grid-cols-3 gap-2 text-base font-bold text-slate-800">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeypadPress(String(num))}
                className="py-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 border border-slate-100 transition active:scale-95 text-center"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleKeypadClear}
              className="py-3.5 rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              CLEAR
            </button>
            <button
              onClick={() => handleKeypadPress('0')}
              className="py-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 border border-slate-100 transition active:scale-95 text-center"
            >
              0
            </button>
            <button
              onClick={handleKeypadDelete}
              className="py-3.5 rounded-2xl bg-slate-50 text-slate-500 hover:text-red-500 text-xs font-semibold"
            >
              DEL ⌫
            </button>
          </div>

          <button
            onClick={() => handleVerify(inputToken, 'KEYPAD_ENTRY')}
            disabled={verifying || inputToken.length === 0}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition shadow-sm"
          >
            {verifying ? 'Checking Pass...' : `Authorize Pass (${inputToken})`}
          </button>
        </div>
      )}

      {/* VERIFICATION RESULT CARD */}
      {lastResult && (
        <div
          className={`p-4 rounded-3xl border animate-in zoom-in-95 duration-150 ${
            lastResult.valid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : lastResult.status === 'ALREADY_CONSUMED'
              ? 'bg-red-50 border-red-200 text-red-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {lastResult.valid ? (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : lastResult.status === 'ALREADY_CONSUMED' ? (
                <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs">
                  <XCircle className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm">{lastResult.studentName || 'Student'}</span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    lastResult.valid
                      ? 'bg-emerald-200 text-emerald-800'
                      : 'bg-red-200 text-red-800'
                  }`}
                >
                  {lastResult.status}
                </span>
              </div>

              <p className="text-xs">{lastResult.message}</p>

              {lastResult.valid && (
                <div className="flex items-center gap-3 text-[11px] text-emerald-800 pt-1">
                  <span>Plan: <b>{lastResult.planName}</b></span>
                  <span>Time: <b>{lastResult.time}</b></span>
                  {lastResult.isFlexiPass && (
                    <span className="text-indigo-700 font-bold">Flexi Credits: {lastResult.remainingCredits} left</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Right Column: Today's Live Attendance Log */}
      <div className="lg:col-span-6 space-y-4">
        <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-600" />
                <span>Today's Verified Diners ({history.length})</span>
              </h4>
              <p className="text-[10px] text-slate-400">Real-time anti-proxy checkin audit trail</p>
            </div>

            <button
              onClick={fetchHistory}
              className="text-[11px] font-semibold text-orange-600 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300" />
              <p>No meal passes checked in yet for today.</p>
              <p className="text-[10px] text-slate-400">Scan student QR codes on the left to authorize plates.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 lg:max-h-[480px] overflow-y-auto pr-1">
              {history.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-800 font-bold flex items-center justify-center text-xs">
                      {item.userName ? item.userName.charAt(0) : 'S'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{item.userName}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.mealType} • {item.planName || 'Meal Pass'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-slate-800">{item.time}</div>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {item.method === 'QR_SCAN' ? 'QR Scanned' : 'PIN Verified'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  </div>
);
};
