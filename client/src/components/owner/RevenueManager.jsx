import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import {
  IndianRupee, TrendingUp, Users, Calendar, Search, Filter,
  CheckCircle2, AlertTriangle, RefreshCw, Clock, ArrowUpRight,
  ShieldAlert, CreditCard, RotateCcw, X, FileText
} from 'lucide-react';

export const RevenueManager = ({ messId }) => {
  const { showToast } = useNotification();
  const [revenueStats, setRevenueStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL');

  // Refund Modal State
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  // Load Revenue Statistics
  const loadRevenue = async () => {
    if (!messId) return;
    setLoadingRevenue(true);
    try {
      const res = await api.getOwnerRevenue(messId);
      if (res && res.revenue) {
        setRevenueStats(res.revenue);
      }
    } catch (e) {
      console.warn('[RevenueManager] Error fetching revenue:', e);
      showToast('Could not load revenue statistics', 'error');
    } finally {
      setLoadingRevenue(false);
    }
  };

  // Load Filtered Payments
  const loadPayments = async () => {
    if (!messId) return;
    setLoadingPayments(true);
    try {
      const filters = {};
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      if (statusFilter !== 'ALL') filters.status = statusFilter;
      if (planFilter !== 'ALL') filters.planId = planFilter;
      if (dateRangeFilter !== 'ALL') filters.dateRange = dateRangeFilter;

      const res = await api.getOwnerPayments(messId, filters);
      if (res && res.payments) {
        setPayments(res.payments);
      } else {
        setPayments([]);
      }
    } catch (e) {
      console.warn('[RevenueManager] Error fetching payments:', e);
      showToast('Could not load payment records', 'error');
    } finally {
      setLoadingPayments(false);
    }
  };

  // Load Mess Plans for Filter dropdown
  const loadPlans = async () => {
    if (!messId) return;
    try {
      const res = await api.getMessPlans(messId);
      if (res && res.plans) {
        setPlans(res.plans);
      }
    } catch (e) {
      console.warn('[RevenueManager] Error fetching plans:', e);
    }
  };

  useEffect(() => {
    loadRevenue();
    loadPlans();
  }, [messId]);

  useEffect(() => {
    loadPayments();
  }, [messId, statusFilter, planFilter, dateRangeFilter]);

  // Handle Search on Enter or debounced
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPayments();
  };

  // Handle Server-Side Refund
  const handleInitiateRefund = async (e) => {
    e.preventDefault();
    if (!selectedPaymentForRefund) return;
    if (!refundReason.trim()) {
      showToast('Please enter a reason for the refund', 'warning');
      return;
    }

    setRefunding(true);
    try {
      const res = await api.refundPayment(selectedPaymentForRefund.id, {
        reason: refundReason.trim(),
        amount: selectedPaymentForRefund.amount
      });

      if (res && res.success) {
        showToast(
          `Refund of ₹${selectedPaymentForRefund.amount} processed successfully.`,
          'success',
          '↩️ Payment Refunded'
        );
        setSelectedPaymentForRefund(null);
        setRefundReason('');
        loadRevenue();
        loadPayments();
      } else {
        showToast(res?.message || 'Failed to process refund', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Error executing refund', 'error');
    } finally {
      setRefunding(false);
    }
  };

  const totalRev = revenueStats?.totalRevenue || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Banner / Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-slate-900">Revenue & Verified Payments</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
              Verified Razorpay Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time financial metrics computed strictly from cryptographically verified gateway transactions.
          </p>
        </div>

        <button
          onClick={() => {
            loadRevenue();
            loadPayments();
          }}
          className="self-start sm:self-center px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingRevenue ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ================= SECTION 1: REVENUE KPIS (SECTION 13) ================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Today */}
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</div>
          <div className="text-lg font-black text-slate-900">
            ₹{(revenueStats?.today || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>Today's Takings</span>
          </div>
        </div>

        {/* This Week */}
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">This Week</div>
          <div className="text-lg font-black text-slate-900">
            ₹{(revenueStats?.thisWeek || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-indigo-600 font-semibold">Last 7 Days</div>
        </div>

        {/* This Month */}
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">This Month</div>
          <div className="text-lg font-black text-orange-600">
            ₹{(revenueStats?.thisMonth || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-orange-600 font-semibold">Current Month</div>
        </div>

        {/* Total Revenue */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md space-y-1">
          <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Total Revenue</div>
          <div className="text-lg font-black text-white">
            ₹{totalRev.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold">Verified All Time</div>
        </div>

        {/* Active Subscribers */}
        <div className="p-4 rounded-3xl bg-emerald-50/70 border border-emerald-200/60 shadow-xs space-y-1">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active Subscribers</div>
          <div className="text-xl font-black text-emerald-900">
            {revenueStats?.activeSubscribers ?? 0}
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold">Valid Passes</div>
        </div>

        {/* Expired Subscribers */}
        <div className="p-4 rounded-3xl bg-rose-50/70 border border-rose-200/60 shadow-xs space-y-1">
          <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Expired Subscribers</div>
          <div className="text-xl font-black text-rose-900">
            {revenueStats?.expiredSubscribers ?? 0}
          </div>
          <div className="text-[10px] text-rose-700 font-semibold">Awaiting Renewal</div>
        </div>
      </div>

      {/* ================= REVENUE BY PLAN BREAKDOWN ================= */}
      {revenueStats?.planBreakdown && revenueStats.planBreakdown.length > 0 && (
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-slate-900">Revenue Breakdown by Plan</h4>
            <span className="text-xs text-slate-400">Share of total earnings</span>
          </div>

          <div className="space-y-3">
            {revenueStats.planBreakdown.map((planItem, idx) => {
              const pct = totalRev > 0 ? Math.round((planItem.totalRevenue / totalRev) * 100) : 0;
              const barColors = [
                'bg-orange-500',
                'bg-indigo-600',
                'bg-emerald-500',
                'bg-amber-500',
                'bg-purple-600'
              ];
              const color = barColors[idx % barColors.length];

              return (
                <div key={planItem.planId || idx} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{planItem.planName}</span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        ({planItem.activeSubscribers} active students)
                      </span>
                    </div>
                    <div className="font-black text-slate-900">
                      ₹{planItem.totalRevenue?.toLocaleString('en-IN')}{' '}
                      <span className="text-slate-400 font-normal">({pct}%)</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(5, pct)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= SECTION 2: PAYMENT HISTORY & FILTERS (SECTION 14) ================= */}
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-base text-slate-900">Student Payment Records</h4>
            <p className="text-xs text-slate-500">
              Verified incoming payments with search and filtering ({payments.length} transactions)
            </p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student or receipt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </form>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Successful Only</option>
            <option value="PENDING">Processing / Pending</option>
            <option value="FAILED">Failed / Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Plans</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
          </select>
        </div>

        {/* Payments Table / List */}
        {loadingPayments ? (
          <div className="space-y-3 animate-pulse pt-2">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-16 bg-slate-100 rounded-2xl"></div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 space-y-2">
            <CreditCard className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="font-bold text-slate-700 text-sm">No Payment Transactions Found</div>
            <p className="text-slate-400">Try adjusting your search criteria or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Subscription Period</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Student Name */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{p.studentName || 'Student'}</div>
                      <div className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                        {p.paymentId || p.orderId}
                      </div>
                    </td>

                    {/* Plan Name */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{p.planName || 'Standard Pass'}</div>
                      <div className="text-[10px] text-slate-400">#{p.receiptNumber || 'N/A'}</div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3 font-black text-slate-900">
                      ₹{p.amount?.toLocaleString('en-IN') || 0}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                        p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        p.status === 'FAILED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {p.status === 'SUCCESS' ? 'Successful' :
                         p.status === 'REFUNDED' ? 'Refunded' :
                         p.status === 'PARTIALLY_REFUNDED' ? 'Partial Refund' :
                         p.status === 'FAILED' ? 'Failed' : 'Processing'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 text-slate-600">
                      <div>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.createdAt ? new Date(p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>

                    {/* Subscription Period */}
                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {p.subscriptionStartDate && p.subscriptionEndDate ? (
                        <span>
                          {p.subscriptionStartDate} <br />
                          <span className="text-[10px] text-slate-400">to {p.subscriptionEndDate}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      {p.status === 'SUCCESS' && (
                        <button
                          onClick={() => {
                            setSelectedPaymentForRefund(p);
                            setRefundReason('');
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 font-bold text-[10px] transition border border-slate-200"
                          title="Refund Transaction"
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Confirmation Modal */}
      {selectedPaymentForRefund && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Initiate Server Refund</h3>
                  <p className="text-[11px] text-slate-500">Record an official refund for this verified transaction</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPaymentForRefund(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-purple-50 rounded-2xl text-xs space-y-1 text-purple-900 border border-purple-200">
              <div className="font-bold">Student: {selectedPaymentForRefund.studentName}</div>
              <div className="flex justify-between">
                <span>Plan: {selectedPaymentForRefund.planName}</span>
                <span className="font-extrabold text-purple-950">₹{selectedPaymentForRefund.amount}</span>
              </div>
              <div className="font-mono text-[10px] text-purple-700 truncate">
                ID: {selectedPaymentForRefund.paymentId}
              </div>
            </div>

            <form onSubmit={handleInitiateRefund} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Reason for Refund <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Student relocated, emergency medical leave, accidental double recharge..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForRefund(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refunding}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/30"
                >
                  {refunding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Confirm Refund</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
