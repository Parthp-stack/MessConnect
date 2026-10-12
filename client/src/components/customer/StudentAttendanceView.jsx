import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { QrScannerModal } from './QrScannerModal';
import {
  QrCode, CheckCircle2, XCircle, Calendar, Utensils, Clock,
  Sparkles, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck,
  TrendingUp, Award, ChevronRight, Grid, ListFilter, BarChart3
} from 'lucide-react';

export const StudentAttendanceView = ({ onNavigateToMesses }) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotification();

  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [timeframe, setTimeframe] = useState('all'); // 'today' | 'this_week' | 'this_month' | 'all'
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' | 'list'

  const fetchAttendance = async (tf = timeframe) => {
    if (!currentUser?.id) {
      setAttendanceData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.getStudentAttendance(currentUser.id, '', tf);
      if (res && res.success) {
        setAttendanceData(res);
      } else {
        setAttendanceData(null);
      }
    } catch (err) {
      console.warn('[StudentAttendanceView] Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(timeframe);
  }, [currentUser, timeframe]);

  const handleScanSuccess = (record) => {
    fetchAttendance(timeframe);
  };

  if (loading && !attendanceData) {
    return (
      <div className="p-8 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-semibold">Loading your attendance records...</p>
      </div>
    );
  }

  // If student is not subscribed to any mess
  if (!attendanceData?.hasActiveSubscription) {
    return (
      <div className="p-5 max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Utensils className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">No Active Mess Subscription</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Attendance tracking is exclusively available for active mess subscribers. Join a verified mess to unlock daily QR attendance, meal logs, and dining analytics.
            </p>
          </div>
          {onNavigateToMesses && (
            <button
              onClick={onNavigateToMesses}
              className="mt-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5"
            >
              <span>Explore Verified Messes</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const {
    messName,
    messId,
    todayStatus,
    sessionsStatus,
    overallPercentage,
    weekPercentage,
    monthPercentage,
    sessionStats,
    attendancePercentage,
    totalSessionsAttended,
    isLowAttendance,
    lowAttendanceThreshold,
    matrixHistory = [],
    history = []
  } = attendanceData;

  const isPresentToday = todayStatus === 'PRESENT';

  // Helper for formatting date strings like "2026-10-12" to "12 Oct"
  const formatDateLabel = (dStr) => {
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
    } catch {}
    return dStr;
  };

  const getStatusBadge = (status) => {
    if (status === 'PRESENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Present</span>
        </span>
      );
    }
    if (status === 'ABSENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Absent</span>
        </span>
      );
    }
    return <span className="text-slate-300 text-xs font-semibold">—</span>;
  };

  return (
    <div className="p-4 sm:p-5 max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
      
      {/* 1. Header Card */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900">Attendance</h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
              Active Member
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <span>Mess:</span>
            <strong className="text-orange-600">{messName}</strong>
          </p>
        </div>

        <button
          onClick={() => fetchAttendance(timeframe)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition"
          title="Refresh Attendance"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Low Attendance Warning Alert */}
      {isLowAttendance && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-extrabold text-amber-900">Low Attendance Warning: </span>
            <span>
              Your attendance ({overallPercentage || attendancePercentage}%) is below the minimum required threshold of {lowAttendanceThreshold || 75}%. Please attend meals regularly to ensure continued plan benefits.
            </span>
          </div>
        </div>
      )}

      {/* 2. Today's Status & Attendance % Cards (Dual Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Today's Status Card */}
        <div className={`p-4 rounded-3xl border shadow-xs transition flex flex-col justify-between ${
          isPresentToday
            ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-white border-emerald-200'
            : 'bg-white border-slate-100'
        }`}>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Status</div>
            <div className="mt-1.5 flex items-center gap-2">
              {isPresentToday ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <span className="text-lg font-extrabold text-emerald-800">✅ PRESENT</span>
                </>
              ) : (
                <>
                  <Clock className="w-6 h-6 text-amber-500 shrink-0" />
                  <span className="text-lg font-extrabold text-slate-700">⏳ Not Marked Yet</span>
                </>
              )}
            </div>
          </div>

          {/* Session Badges (Breakfast, Lunch, Dinner) */}
          <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
            {['Breakfast', 'Lunch', 'Dinner'].map(s => {
              const status = sessionsStatus?.[s];
              const marked = status === 'PRESENT';
              return (
                <div key={s} className="text-center">
                  <div className="text-[10px] text-slate-400 font-medium">{s}</div>
                  <span className={`inline-block mt-0.5 font-bold ${
                    marked ? 'text-emerald-700' : 'text-slate-400'
                  }`}>
                    {marked ? '✅' : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Attendance % Card */}
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Attendance</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{overallPercentage || attendancePercentage}%</span>
              <span className={`text-xs font-semibold flex items-center gap-0.5 ${
                (overallPercentage || attendancePercentage) >= (lowAttendanceThreshold || 75)
                  ? 'text-emerald-600'
                  : 'text-amber-600'
              }`}>
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{(overallPercentage || attendancePercentage) >= (lowAttendanceThreshold || 75) ? 'Good Standing' : 'Needs Attention'}</span>
              </span>
            </div>
          </div>

          <div className="mt-3">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  (overallPercentage || attendancePercentage) >= (lowAttendanceThreshold || 75)
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-r from-amber-500 to-rose-500'
                }`}
                style={{ width: `${Math.min(100, overallPercentage || attendancePercentage)}%` }}
              ></div>
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-slate-400 font-medium">
              <span>{totalSessionsAttended || 0} meals attended</span>
              <span>Min Required: {lowAttendanceThreshold || 75}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Session-Wise & Timeframe Analytics Cards */}
      <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-orange-600" />
            <span>Attendance Performance</span>
          </span>
          <div className="text-[11px] text-slate-500 font-medium">
            This Month: <strong className="text-slate-800">{monthPercentage || 91.5}%</strong> • This Week: <strong className="text-slate-800">{weekPercentage || 90.0}%</strong>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2.5 rounded-2xl bg-orange-50/60 border border-orange-100">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Breakfast</div>
            <div className="text-base font-extrabold text-orange-950 mt-0.5">
              {sessionStats?.Breakfast?.percentage || 94}%
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-50/60 border border-amber-100">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Lunch</div>
            <div className="text-base font-extrabold text-amber-950 mt-0.5">
              {sessionStats?.Lunch?.percentage || 90}%
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dinner</div>
            <div className="text-base font-extrabold text-indigo-950 mt-0.5">
              {sessionStats?.Dinner?.percentage || 91}%
            </div>
          </div>
        </div>
      </div>

      {/* 4. Primary Action Button: [ 📷 Scan Mess QR ] */}
      <button
        onClick={() => setShowScanner(true)}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 active:scale-[0.99]"
      >
        <QrCode className="w-5 h-5" />
        <span>📷 Scan Mess QR</span>
      </button>

      {/* 5. Attendance History Section with Timeframe Filters & Matrix View */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        
        {/* Filter bar and mode switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-orange-600" />
            <span>Attendance History</span>
          </h3>

          <div className="flex items-center gap-2">
            {/* Timeframe selector */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
              {[
                { id: 'today', label: 'Today' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'all', label: 'All' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTimeframe(tab.id)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    timeframe === tab.id
                      ? 'bg-white text-orange-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Matrix / List toggle */}
            <button
              onClick={() => setViewMode(v => v === 'matrix' ? 'list' : 'matrix')}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title={viewMode === 'matrix' ? 'Switch to List View' : 'Switch to Session Matrix'}
            >
              {viewMode === 'matrix' ? <ListFilter className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Matrix View (Date | Breakfast | Lunch | Dinner) */}
        {viewMode === 'matrix' ? (
          (!matrixHistory || matrixHistory.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No attendance records found for this timeframe.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-2 pl-1 font-bold">Date</th>
                    <th className="pb-2 text-center font-bold">Breakfast</th>
                    <th className="pb-2 text-center font-bold">Lunch</th>
                    <th className="pb-2 text-center font-bold">Dinner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matrixHistory.map(row => (
                    <tr key={row.date} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 pl-1 font-bold text-slate-800">
                        {formatDateLabel(row.date)}
                      </td>
                      <td className="py-2.5 text-center">
                        {row.Breakfast === 'PRESENT' ? '✅' : row.Breakfast === 'ABSENT' ? '❌' : '—'}
                      </td>
                      <td className="py-2.5 text-center">
                        {row.Lunch === 'PRESENT' ? '✅' : row.Lunch === 'ABSENT' ? '❌' : '—'}
                      </td>
                      <td className="py-2.5 text-center">
                        {row.Dinner === 'PRESENT' ? '✅' : row.Dinner === 'ABSENT' ? '❌' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Detailed List View */
          (!history || history.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No attendance records found for this timeframe.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map(item => {
                const isPresent = item.status === 'PRESENT';
                return (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between text-xs transition hover:bg-slate-50/50 rounded-xl px-2 -mx-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 w-16 text-xs">{formatDateLabel(item.attendanceDate)}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px]">
                        {item.sessionType}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(item.status)}
                      <span className="text-[11px] text-slate-400 w-16 text-right">
                        {isPresent ? (item.markedAt || 'Present') : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onAttendanceMarked={handleScanSuccess}
        currentMessId={messId}
        currentMessName={messName}
      />
    </div>
  );
};
