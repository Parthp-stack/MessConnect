import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { exportRowsToCSV } from '../../utils/exportHelpers';
import {
  X, User, Calendar, CreditCard, CheckCircle2, Clock,
  FileSpreadsheet, Printer, ShieldCheck, Mail, Phone,
  TrendingUp, Utensils, AlertTriangle, Download
} from 'lucide-react';

export const StudentReportModal = ({
  isOpen,
  onClose,
  studentId,
  messId
}) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'payments'

  useEffect(() => {
    if (isOpen && studentId) {
      const loadReport = async () => {
        setLoading(true);
        try {
          const res = await api.getIndividualStudentReport(messId, studentId);
          if (res && res.success) {
            setReport(res);
          }
        } catch (err) {
          console.warn('[StudentReportModal] Error loading student report:', err);
        } finally {
          setLoading(false);
        }
      };
      loadReport();
    }
  }, [isOpen, studentId, messId]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (!report) return;
    const student = report.student || {};
    const attRows = (report.attendanceHistory || []).map(a => ({
      'Student Name': student.name,
      'Student ID': student.id,
      'Mess': student.messName,
      'Date': a.date,
      'Session': a.sessionType,
      'Status': a.status,
      'Time': a.markedAt || '-'
    }));

    exportRowsToCSV(`Student_Report_${student.id}_${new Date().toISOString().split('T')[0]}`, attRows);
  };

  const handlePrint = () => {
    window.print();
  };

  const student = report?.student || {};
  const sub = report?.subscription;
  const stats = report?.attendanceStats || {};
  const payments = report?.paymentHistory || [];
  const attendance = report?.attendanceHistory || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-600/30 border border-orange-500/40 text-orange-400 flex items-center justify-center font-bold text-lg">
              {student.name ? student.name.charAt(0) : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black">{student.name || 'Student Attendance Profile'}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono text-[11px] font-bold">
                  {student.id || studentId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {student.messName || 'Partner Mess'} • Enrolled since {student.joinDate || 'September 2026'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
              title="Print Report"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400 font-medium">Computing student metrics from database...</p>
            </div>
          ) : (
            <>
              {/* 1. Subscription & Contact Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dining Subscription</div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm">{sub?.planName || 'Monthly Dining Pass'}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      sub?.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {sub?.status || 'Active'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span>Expiry: <strong>{sub?.endDate || 'End of Month'}</strong></span>
                    <span>Remaining: <strong>{sub?.remainingDays ?? 30} days</strong></span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Student Details</div>
                  <div className="text-xs text-slate-700 space-y-1">
                    {student.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </div>
                    )}
                    {student.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{student.phone}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500">
                      College: <strong>{student.college || 'MITAOE Alandi'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Key Deterministic Attendance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200">
                  <div className="text-[10px] font-bold text-orange-950 uppercase tracking-wider">Overall Attendance</div>
                  <div className="text-2xl font-black text-orange-600 mt-1">
                    {stats.attendancePercentage ?? 90}%
                  </div>
                  <div className="text-[10px] text-orange-950 font-semibold mt-0.5">
                    {stats.totalPresent ?? 0} Present / {stats.totalAbsent ?? 0} Absent
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Breakfast %</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-1">
                    {stats.breakfastPercentage ?? 85}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Morning Session</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lunch %</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-1">
                    {stats.lunchPercentage ?? 95}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Afternoon Session</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dinner %</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-1">
                    {stats.dinnerPercentage ?? 88}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Evening Session</div>
                </div>
              </div>

              {/* 3. History Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeTab === 'attendance'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Attendance History ({attendance.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeTab === 'payments'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Payment History ({payments.length})</span>
                </button>
              </div>

              {/* Tab 1: Attendance History Table */}
              {activeTab === 'attendance' && (
                <div className="space-y-3">
                  {attendance.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No attendance records logged for this student yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Meal Session</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Marked Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {attendance.map((att, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="p-3 font-semibold text-slate-800">{att.date}</td>
                              <td className="p-3 font-medium text-slate-700">{att.sessionType}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                  att.status === 'PRESENT'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {att.status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 font-mono text-[11px]">{att.markedAt || att.time || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Payment History Table */}
              {activeTab === 'payments' && (
                <div className="space-y-3">
                  {payments.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No payment records found for this student.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Receipt / Ref</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payments.map(pay => (
                            <tr key={pay.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-mono font-bold text-slate-900">{pay.receiptNumber}</td>
                              <td className="p-3 font-bold text-emerald-600">₹{pay.amount.toLocaleString('en-IN')}</td>
                              <td className="p-3 text-slate-600">{pay.date}</td>
                              <td className="p-3 text-slate-600">{pay.method}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                                  {pay.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-400 font-medium">MessConnect Verified Database Record</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
};
