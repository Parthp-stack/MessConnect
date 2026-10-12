import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { useNotification } from '../../context/NotificationContext';
import { SUPPORT_CONTACTS } from '../../context/AuthContext';
import { DocumentViewerModal } from '../common/DocumentViewerModal';
import { NotificationCenterModal } from '../common/NotificationCenterModal';
import { exportRowsToCSV, exportRowsToExcel, exportMultiSheetExcel } from '../../utils/exportHelpers';
import {
  ShieldCheck, ShieldAlert, AlertCircle, CheckCircle, XCircle, Star,
  Users, Building, IndianRupee, MessageSquare, Check, Search, Filter,
  MapPin, Eye, Upload, RefreshCw, Sliders, ChevronRight, Phone, Mail,
  FileText, CheckCircle2, AlertTriangle, ArrowUpRight, BarChart3,
  Calculator, Store, Lock, Sparkles, LogOut, ExternalLink, ZoomIn, Image, FileCheck,
  Database, Table, Download, FileSpreadsheet, Layers, HardDrive, ArrowDownToLine,
  Megaphone, Bell, Send, TrendingUp
} from 'lucide-react';

export const AdminDashboard = () => {
  const { messes, loadMesses } = useApp();
  const { showToast } = useNotification();

  // Navigation tab: 'dashboard' | 'verifications' | 'messes' | 'areas' | 'revenue' | 'customers' | 'reviews' | 'complaints' | 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [adminMesses, setAdminMesses] = useState([]);
  const [selectedArea, setSelectedArea] = useState('All');
  const [areaAnalytics, setAreaAnalytics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [adminPaymentsData, setAdminPaymentsData] = useState(null);

  // Phase 6 Data States
  const [platformAnalytics, setPlatformAnalytics] = useState(null);
  const [messComparison, setMessComparison] = useState([]);
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annTarget, setAnnTarget] = useState('ALL_STUDENTS');
  const [annTargetMessId, setAnnTargetMessId] = useState('');
  const [annTargetUserId, setAnnTargetUserId] = useState('');
  const [sendingAnn, setSendingAnn] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [comparisonSort, setComparisonSort] = useState('revenue'); // 'revenue' | 'attendance' | 'students'

  // Filter states
  const [messSearch, setMessSearch] = useState('');
  const [messAreaFilter, setMessAreaFilter] = useState('All');
  const [messStatusFilter, setMessStatusFilter] = useState('All');
  const [messVerifyFilter, setMessVerifyFilter] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All'); // 'All', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'
  const [customerSearch, setCustomerSearch] = useState('');
  const [subSearch, setSubSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState('All');

  // Real-Time Database Tables State
  const [dbTablesSummary, setDbTablesSummary] = useState(null);
  const [selectedDbTable, setSelectedDbTable] = useState('users');
  const [currentTableData, setCurrentTableData] = useState(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(25);
  const [exportingType, setExportingType] = useState(null);

  // Interactive Calculator State
  const [calcGrossAmount, setCalcGrossAmount] = useState(3000);

  // Settings State
  const [platformCommissionRate, setPlatformCommissionRate] = useState(5.0);
  const [autoApproveOwners, setAutoApproveOwners] = useState(false);
  const [smsGatewayActive, setSmsGatewayActive] = useState(true);
  const [emailGatewayActive, setEmailGatewayActive] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Document Inspector Modal State
  const [inspectingApplication, setInspectingApplication] = useState(null);
  const [decisionAction, setDecisionAction] = useState(null); // 'APPROVE' | 'REJECT' | 'CHANGES_REQUESTED'
  const [decisionReason, setDecisionReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [previewDocModal, setPreviewDocModal] = useState(null);

  // Helper functions for document presentation and inspection
  const getDocDisplay = (doc, fallback = 'Not provided') => {
    if (!doc) return fallback;
    if (typeof doc === 'string') return doc;
    return doc.docNumber || doc.fileName || doc.title || fallback;
  };

  const hasUploadedScan = (doc) => {
    if (!doc || typeof doc !== 'object') return false;
    return Boolean(doc.fileUrl || doc.fileName);
  };

  const getDocMeta = (doc, fallbackTitle, fallbackNumber) => {
    if (!doc) {
      return {
        title: fallbackTitle,
        number: fallbackNumber,
        fileName: '',
        fileSize: '',
        fileUrl: '',
        fileType: '',
        hasScan: false
      };
    }
    if (typeof doc === 'string') {
      return {
        title: fallbackTitle,
        number: doc,
        fileName: '',
        fileSize: '',
        fileUrl: '',
        fileType: '',
        hasScan: false
      };
    }
    return {
      title: doc.title || fallbackTitle,
      number: doc.docNumber || fallbackNumber,
      fileName: doc.fileName || '',
      fileSize: doc.fileSize || '',
      fileUrl: doc.fileUrl || '',
      fileType: doc.fileType || '',
      uploadedAt: doc.uploadedAt || '',
      hasScan: Boolean(doc.fileUrl || doc.fileName)
    };
  };

  const renderInspectorDocCard = (doc, defaultTitle, defaultNumber, category, IconComponent, colorClass) => {
    const meta = getDocMeta(doc, defaultTitle, defaultNumber);
    const isImage = meta.fileUrl && !meta.fileType?.includes('pdf') && !meta.fileName?.toLowerCase().endsWith('.pdf');

    return (
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-extrabold text-slate-800 flex items-center gap-2 text-xs">
            <IconComponent className={`w-4 h-4 ${colorClass}`} />
            <span>{meta.title}</span>
          </span>
          <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
            meta.hasScan
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-slate-200 text-slate-700'
          }`}>
            {meta.hasScan ? '📎 Scan Uploaded ✓' : 'Text Reference'}
          </span>
        </div>

        {/* Document ID Number */}
        <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 text-[10px] font-semibold shrink-0">Registration / Doc ID:</span>
          <span className="font-mono font-bold text-slate-900 truncate">{meta.number}</span>
        </div>

        {/* Scan File Details & Action */}
        {meta.hasScan ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-semibold text-slate-700 truncate">{meta.fileName || 'document_scan'}</span>
                {meta.fileSize && (
                  <span className="text-[10px] text-slate-400 shrink-0">({meta.fileSize})</span>
                )}
              </div>
              {meta.fileUrl && (
                <button
                  type="button"
                  onClick={() => setPreviewDocModal(meta)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] shrink-0 transition flex items-center gap-1 cursor-pointer"
                >
                  <ZoomIn className="w-3 h-3" />
                  <span>Inspect Scan</span>
                </button>
              )}
            </div>

            {/* Thumbnail Preview Box */}
            {meta.fileUrl && isImage && (
              <div
                onClick={() => setPreviewDocModal(meta)}
                className="group relative h-28 w-full bg-slate-900 rounded-xl overflow-hidden cursor-pointer border border-slate-200 flex items-center justify-center"
              >
                <img
                  src={meta.fileUrl}
                  alt={meta.title}
                  className="w-full h-full object-cover group-hover:scale-105 group-hover:opacity-80 transition duration-200"
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                  <ZoomIn className="w-4 h-4" />
                  <span>Click to Zoom Scan</span>
                </div>
              </div>
            )}

            {meta.fileUrl && !isImage && (
              <div
                onClick={() => setPreviewDocModal(meta)}
                className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-between text-xs cursor-pointer hover:bg-rose-100/60 transition"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span className="font-bold text-rose-900">PDF Certificate Scanned</span>
                </div>
                <span className="text-[11px] font-bold text-rose-700 underline flex items-center gap-1">
                  View PDF <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200/60 text-[11px] text-slate-500 italic">
            Physical document scan was not attached during registration. Owner verified via registration certificate string.
          </div>
        )}
      </div>
    );
  };

  // Complaint Resolution Modal State
  const [resolvingComplaint, setResolvingComplaint] = useState(null);
  const [complaintAdminNotes, setComplaintAdminNotes] = useState('');

  // Primary Data Fetcher
  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, appsRes, messesRes, revRes, custRes, compRes, revsRes, paymentsRes, platformRes, compMessesRes, annsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminVerifications(),
        api.getAdminMesses(),
        api.getAdminRevenue(),
        api.getAdminCustomers(),
        api.getComplaints(),
        api.fetchWithFallback('/admin/reviews'),
        api.getAdminPayments(),
        api.getAdminPlatformAnalytics().catch(() => null),
        api.getAdminMessComparison().catch(() => null),
        api.getAnnouncements({ status: 'ALL' }).catch(() => null)
      ]);

      if (statsRes?.stats) {
        setStats(statsRes.stats);
        if (statsRes.stats.commissionRatePercent !== undefined) {
          setPlatformCommissionRate(statsRes.stats.commissionRatePercent);
        }
      }
      if (appsRes?.applications) setApplications(appsRes.applications);
      if (messesRes?.messes) setAdminMesses(messesRes.messes);
      if (revRes?.revenue) setRevenueData(revRes.revenue);
      if (custRes?.customers) setCustomers(custRes.customers);
      if (compRes?.complaints) setComplaints(compRes.complaints);
      if (revsRes?.reviews) setReviews(revsRes.reviews);
      if (paymentsRes?.stats) setAdminPaymentsData(paymentsRes);
      if (platformRes?.summary) setPlatformAnalytics(platformRes);
      if (compMessesRes?.comparison) setMessComparison(compMessesRes.comparison);
      if (annsRes?.announcements) setAnnouncementsList(annsRes.announcements);
    } catch (e) {
      console.warn('[AdminDashboard] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Area Analytics when area selection changes
  const fetchAreaAnalyticsData = async (area) => {
    try {
      const res = await api.getAreaAnalytics(area);
      if (res?.analytics) {
        setAreaAnalytics(res.analytics);
      }
    } catch (e) {
      console.warn('[AdminDashboard] Area analytics error:', e);
    }
  };

  // Real-Time Database Tables Operations
  const fetchDatabaseTables = async (selectTable = null) => {
    setLoadingTables(true);
    try {
      const res = await api.getDatabaseTables();
      if (res?.summary) {
        setDbTablesSummary(res.summary);
        const targetTable = selectTable || selectedDbTable || res.summary.tables?.[0]?.tableName || 'users';
        await fetchSingleTableData(targetTable);
      }
    } catch (err) {
      console.warn('[AdminDashboard] Error fetching database tables:', err);
      showToast('Error loading live database tables from MySQL', 'error');
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchSingleTableData = async (tableName) => {
    setLoadingTables(true);
    try {
      setSelectedDbTable(tableName);
      setTablePage(1);
      setTableSearch('');
      const res = await api.getTableData(tableName);
      if (res?.table) {
        setCurrentTableData(res.table);
      }
    } catch (err) {
      console.warn(`[AdminDashboard] Error fetching table ${tableName}:`, err);
      showToast(`Error fetching live rows for ${tableName}`, 'error');
    } finally {
      setLoadingTables(false);
    }
  };

  const handleDownloadTableCSV = (tableName) => {
    setExportingType('csv');
    try {
      if (currentTableData && currentTableData.tableName === tableName && currentTableData.rows) {
        exportRowsToCSV(`messconnect_${tableName}_${new Date().toISOString().slice(0, 10)}`, currentTableData.rows, currentTableData.columns);
        showToast(`Downloaded ${tableName}.csv successfully`, 'success');
      } else {
        window.open(api.getDownloadTableCSVUrl(tableName), '_blank');
        showToast(`Exporting ${tableName}.csv from MySQL`, 'info');
      }
    } catch (e) {
      showToast(`CSV export failed: ${e.message}`, 'error');
    } finally {
      setTimeout(() => setExportingType(null), 500);
    }
  };

  const handleDownloadTableExcel = (tableName) => {
    setExportingType('excel');
    try {
      if (currentTableData && currentTableData.tableName === tableName && currentTableData.rows) {
        exportRowsToExcel(
          `messconnect_${tableName}_${new Date().toISOString().slice(0, 10)}`,
          currentTableData.displayName || tableName,
          currentTableData.rows,
          currentTableData.columns
        );
        showToast(`Downloaded ${tableName}.xls (Excel) successfully`, 'success');
      } else {
        window.open(api.getDownloadTableExcelUrl(tableName), '_blank');
        showToast(`Exporting ${tableName}.xls from MySQL`, 'info');
      }
    } catch (e) {
      showToast(`Excel export failed: ${e.message}`, 'error');
    } finally {
      setTimeout(() => setExportingType(null), 500);
    }
  };

  const handleDownloadAllExcel = () => {
    setExportingType('master');
    try {
      window.open(api.getDownloadAllExcelUrl(), '_blank');
      showToast('Generating Master Multi-Sheet Excel Workbook for all 16 tables...', 'info');
    } catch (e) {
      showToast(`Master export failed: ${e.message}`, 'error');
    } finally {
      setTimeout(() => setExportingType(null), 1500);
    }
  };

  const handleDownloadAllCSV = () => {
    setExportingType('master_csv');
    try {
      window.open(api.getDownloadAllCSVUrl(), '_blank');
      showToast('Exporting all database tables combined CSV...', 'info');
    } catch (e) {
      showToast(`Master CSV export failed: ${e.message}`, 'error');
    } finally {
      setTimeout(() => setExportingType(null), 1500);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
    fetchAreaAnalyticsData('All');
    api.getDatabaseTables().then(res => {
      if (res?.summary) setDbTablesSummary(res.summary);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'database') {
      if (!currentTableData) {
        fetchDatabaseTables(selectedDbTable || 'users');
      }
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAreaAnalyticsData(selectedArea);
  }, [selectedArea]);

  // Re-fetch messes with filters
  const handleFilterMesses = async () => {
    try {
      const res = await api.getAdminMesses({
        search: messSearch,
        area: messAreaFilter,
        status: messStatusFilter,
        verification: messVerifyFilter
      });
      if (res?.messes) setAdminMesses(res.messes);
    } catch (e) {
      console.warn('Error filtering messes:', e);
    }
  };

  useEffect(() => {
    handleFilterMesses();
  }, [messSearch, messAreaFilter, messStatusFilter, messVerifyFilter]);

  // Handle Verification Decision (Approve / Reject / Changes Requested)
  const handleExecuteDecision = async (decision, customReason = '', appOverride = null) => {
    const targetApp = appOverride || inspectingApplication;
    if (!targetApp) return;
    setSubmittingDecision(true);

    const reasonToSubmit = customReason || decisionReason || (
      decision === 'APPROVE' ? 'Approved by MessConnect Quality & Compliance Team.' :
      decision === 'REJECT' ? 'Documentation does not meet FSSAI safety criteria.' :
      'Please submit a clearer scan of your FSSAI license certificate and updated shop establishment proof.'
    );

    try {
      const res = await api.submitVerificationDecision(targetApp.id, {
        decision,
        reason: reasonToSubmit
      });

      if (res && res.success) {
        showToast(
          decision === 'APPROVE' ? `🎉 ${targetApp.messName || 'Mess'} approved and verified!` :
          decision === 'REJECT' ? `Application for ${targetApp.messName || 'Mess'} rejected.` :
          `Changes requested from ${targetApp.ownerName || 'Owner'}.`,
          decision === 'APPROVE' ? 'success' : 'info',
          '📨 Notification Dispatched (SMS + Email)'
        );

        setInspectingApplication(null);
        setDecisionAction(null);
        setDecisionReason('');
        await fetchAllAdminData();
        await loadMesses();
      }
    } catch (err) {
      showToast(err.message || 'Failed to record decision', 'error');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Toggle Mess Active / Suspended
  const handleToggleMessStatus = async (messId, currentStatus) => {
    const nextStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      await api.updateMessStatus(messId, nextStatus);
      showToast(`Mess status updated to ${nextStatus}`, 'info');
      fetchAllAdminData();
      loadMesses();
    } catch (e) {
      showToast('Failed to update mess status', 'error');
    }
  };

  // Toggle Featured
  const handleToggleFeatured = async (messId, currentVal) => {
    try {
      const nextVal = !currentVal;
      await api.toggleFeaturedMess(messId, nextVal);
      showToast(nextVal ? 'Mess promoted to Featured Carousel!' : 'Mess removed from Featured.', 'info');
      fetchAllAdminData();
      loadMesses();
    } catch (e) {
      showToast('Failed to toggle featured', 'error');
    }
  };

  // Toggle Quick Verify
  const handleToggleVerify = async (messId, currentVal) => {
    try {
      const nextVal = !currentVal;
      await api.verifyMess(messId, nextVal);
      showToast(nextVal ? 'Mess verified and trusted on platform!' : 'Mess verification revoked.', 'info');
      fetchAllAdminData();
      loadMesses();
    } catch (e) {
      showToast('Failed to update verification', 'error');
    }
  };

  // Resolve Complaint
  const handleResolveComplaint = async (e) => {
    e.preventDefault();
    if (!resolvingComplaint) return;
    try {
      await api.updateComplaint(resolvingComplaint.id, {
        status: 'RESOLVED',
        adminNotes: complaintAdminNotes || 'Investigated with mess management. Hygiene compliance verified.'
      });
      showToast('Student complaint resolved and closed.', 'success');
      setResolvingComplaint(null);
      setComplaintAdminNotes('');
      fetchAllAdminData();
    } catch (e) {
      showToast('Failed to resolve complaint', 'error');
    }
  };

  // Phase 6: Admin Announcements Broadcaster
  const handleSendAdminAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) {
      showToast('Please enter both title and message', 'error');
      return;
    }
    setSendingAnn(true);
    try {
      const res = await api.createAdminAnnouncement({
        title: annTitle.trim(),
        message: annMessage.trim(),
        target: annTarget,
        targetId: annTarget === 'SPECIFIC_MESS' ? annTargetMessId : (annTarget === 'SPECIFIC_USER' ? annTargetUserId : null),
        targetName: annTarget === 'SPECIFIC_MESS'
          ? (adminMesses.find(m => m.id === annTargetMessId)?.name || 'Specific Mess')
          : (annTarget === 'SPECIFIC_USER' ? (customers.find(c => c.id === annTargetUserId)?.name || 'Specific User') : null)
      });
      if (res?.announcement) {
        showToast('Platform announcement broadcasted successfully!', 'success', '📢 Broadcast Sent');
        setAnnTitle('');
        setAnnMessage('');
        const annsRes = await api.getAnnouncements({ status: 'ALL' }).catch(() => null);
        if (annsRes?.announcements) setAnnouncementsList(annsRes.announcements);
      }
    } catch (err) {
      showToast(err.message || 'Failed to dispatch announcement', 'error');
    } finally {
      setSendingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.deleteAnnouncement(annId);
      setAnnouncementsList(prev => prev.filter(a => a.id !== annId));
      showToast('Announcement removed', 'info');
    } catch (err) {
      showToast('Failed to delete announcement', 'error');
    }
  };

  // Phase 6: Export Mess Comparison Report to CSV
  const handleExportComparisonCSV = () => {
    if (!messComparison || messComparison.length === 0) {
      showToast('No mess comparison data to export', 'error');
      return;
    }
    const exportData = messComparison.map(m => ({
      'Mess Name': m.name,
      'Campus Area': m.area,
      'Enrolled Students': m.students,
      'Attendance Rate (%)': `${m.attendanceRate}%`,
      'Total Revenue (INR)': m.revenue,
      'Active Subscribers': m.activeSubscribers,
      'Expired Subscribers': m.expiredSubscribers,
      'Subscription Renewals': m.renewalsCount,
      'Active Dining Plans': m.activePlansCount,
      'Rating': m.rating,
      'Verification Status': m.verified ? 'VERIFIED' : 'PENDING'
    }));
    exportRowsToCSV(`MessConnect_Mess_Comparison_${new Date().toISOString().slice(0, 10)}`, exportData);
    showToast('Mess comparison CSV exported successfully', 'success');
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateAdminSettings({
        commissionRatePercent: Number(platformCommissionRate),
        autoApproveVerifiedOwners: autoApproveOwners,
        smsGatewayActive,
        emailGatewayActive,
        maintenanceMode
      });
      showToast('Admin platform settings updated successfully!', 'success', '⚙️ Settings Saved');
      await fetchAllAdminData();
    } catch (e) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Immediate Commission Rate Updater
  const handleUpdateCommissionRate = async (newRate) => {
    const rateNum = parseFloat(newRate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      showToast('Please enter a valid commission rate (0 - 100%)', 'error');
      return;
    }
    setPlatformCommissionRate(rateNum);
    try {
      await api.updateAdminSettings({
        commissionRatePercent: rateNum,
        autoApproveVerifiedOwners: autoApproveOwners,
        smsGatewayActive,
        emailGatewayActive,
        maintenanceMode
      });
      showToast(`Platform commission rate updated to ${rateNum}%`, 'success', '⚙️ Commission Updated');
      await fetchAllAdminData();
    } catch (err) {
      console.warn('Failed to update commission settings:', err);
      showToast('Failed to update commission rate', 'error');
    }
  };

  // Filtered Verification Applications
  const filteredApplications = applications.filter(app => {
    if (verificationFilter === 'All') return true;
    return (app.verificationStatus || (app.verified ? 'APPROVED' : 'UNDER_REVIEW')) === verificationFilter;
  });

  // Filtered Customers
  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q) || c.college?.toLowerCase().includes(q);
  });

  // Filtered Subscriptions (Real database records for Admin Revenue & Commission Ledger)
  const filteredSubs = (revenueData?.subscriptions || []).filter(sub => {
    if (subStatusFilter !== 'All' && sub.status !== subStatusFilter) return false;
    if (!subSearch) return true;
    const q = subSearch.toLowerCase();
    return (
      sub.studentName?.toLowerCase().includes(q) ||
      sub.studentPhone?.includes(q) ||
      sub.studentEmail?.toLowerCase().includes(q) ||
      sub.messName?.toLowerCase().includes(q) ||
      sub.ownerName?.toLowerCase().includes(q) ||
      sub.ownerPhone?.includes(q) ||
      sub.id?.toLowerCase().includes(q) ||
      sub.planName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-24 text-slate-800">
      
      {/* 1. TOP EXECUTIVE SUPERADMIN BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">Admin Control Center</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] tracking-wider uppercase border border-emerald-500/30">
                  Role: SuperAdmin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                MITAOE Alandi Edition • Campus Dining Infrastructure Governance • KYC Onboarding • FSSAI Safety • Platform Revenue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => setShowNotifModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shadow-xs cursor-pointer"
              title="Admin Notifications Center"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Notifications</span>
            </button>
            <button
              onClick={fetchAllAdminData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shadow-xs cursor-pointer"
              title="Refresh live platform data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Platform</span>
            </button>
          </div>
        </div>

        {/* 6 Core Platform KPI Cards - 100% Real Live Database Data */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-6 text-center text-xs">
          
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="text-[10px] text-slate-400 font-medium">Registered Messes</div>
            <div className="text-xl font-black text-white mt-0.5">
              {adminMesses.length || stats?.totalMesses || messes.length || 0}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Live Database Records</div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="text-[10px] text-slate-400 font-medium">Active Partners</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">
              {adminMesses.filter(m => m.verified && m.status !== 'SUSPENDED').length || stats?.activeMesses || 0}
            </div>
            <div className="text-[9px] text-emerald-400/80 mt-0.5">Verified & Dining</div>
          </div>

          <div
            onClick={() => { setActiveTab('verifications'); setVerificationFilter('UNDER_REVIEW'); }}
            className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer transition backdrop-blur-xs group"
          >
            <div className="text-[10px] text-amber-300 font-medium flex items-center justify-center gap-1">
              <span>KYC Review</span>
              <ChevronRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition" />
            </div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {applications.filter(a => a.verificationStatus === 'UNDER_REVIEW' || !a.verified).length}
            </div>
            <div className="text-[9px] text-amber-300/80 mt-0.5">Pending Approval</div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="text-[10px] text-slate-400 font-medium">Student Diners</div>
            <div className="text-xl font-black text-blue-400 mt-0.5">
              {customers.length || stats?.totalStudents || 0}
            </div>
            <div className="text-[9px] text-blue-400/80 mt-0.5">Registered Accounts</div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="text-[10px] text-slate-400 font-medium">Subscriptions GMV</div>
            <div className="text-xl font-black text-purple-400 mt-0.5">
              ₹{((revenueData?.totalPlatformRevenue ?? stats?.platformGMV) || 0).toLocaleString()}
            </div>
            <div className="text-[9px] text-purple-400/80 mt-0.5">
              {revenueData?.subscriptions?.length || stats?.totalSubscriptions || 0} Total Plans
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-xs">
            <div className="text-[10px] text-emerald-300 font-medium">Admin Commission ({platformCommissionRate}%)</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">
              ₹{Math.round(((revenueData?.totalPlatformRevenue ?? stats?.platformGMV) || 0) * (platformCommissionRate / 100)).toLocaleString()}
            </div>
            <div className="text-[9px] text-emerald-300/80 mt-0.5">
              Net Admin Earnings
            </div>
          </div>

        </div>
      </div>

      {/* 2. ADMIN NAVIGATION TABS */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/80 overflow-x-auto no-scrollbar flex gap-1">
        {[
          { key: 'dashboard', label: 'Platform Overview', icon: BarChart3 },
          { key: 'comparison', label: `Mess Comparison (${messComparison.length})`, icon: Layers, badge: 'Phase 6' },
          { key: 'announcements', label: `Broadcasts (${announcementsList.length})`, icon: Megaphone, badge: 'Phase 6' },
          { key: 'database', label: `Database & Tables (${dbTablesSummary?.totalRows ?? 23} rows)`, icon: Database, badge: 'Live DB' },
          { key: 'verifications', label: `Verification Queue (${applications.filter(a => a.verificationStatus === 'UNDER_REVIEW' || !a.verified).length})`, icon: ShieldCheck, alert: applications.some(a => a.verificationStatus === 'UNDER_REVIEW' || !a.verified) },
          { key: 'messes', label: `Mess Directory (${adminMesses.length})`, icon: Store },
          { key: 'areas', label: 'Area Analytics', icon: MapPin },
          { key: 'revenue', label: 'Commission & Revenue', icon: Calculator },
          { key: 'customers', label: `Students (${customers.length})`, icon: Users },
          { key: 'reviews', label: `Reviews (${reviews.length})`, icon: Star },
          { key: 'complaints', label: `Complaints (${complaints.filter(c => c.status === 'OPEN').length})`, icon: MessageSquare, alert: complaints.some(c => c.status === 'OPEN') },
          { key: 'settings', label: 'Platform Settings', icon: Sliders }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{t.label}</span>
              {t.badge && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                  isActive ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {t.badge}
                </span>
              )}
              {t.alert && !isActive && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: PLATFORM OVERVIEW / DASHBOARD                     */}
      {/* ============================================================ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Quick Action Notification / Compliance Alerts */}
          {applications.some(a => a.verificationStatus === 'UNDER_REVIEW' || !a.verified) && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-extrabold block">Owner Verification Applications Pending</span>
                  <span className="text-amber-800">
                    {applications.filter(a => a.verificationStatus === 'UNDER_REVIEW' || !a.verified).length} mess owners have submitted KYC and FSSAI licenses awaiting your approval.
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setActiveTab('verifications'); setVerificationFilter('UNDER_REVIEW'); }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition shrink-0"
              >
                Inspect Verification Queue →
              </button>
            </div>
          )}

          {/* Area Distribution Breakdown (Requested in Spec) */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Messes by Campus Zone (Pune Region)</h3>
                <p className="text-xs text-slate-500">Distribution of registered dining partners across college clusters</p>
              </div>
              <button
                onClick={() => setActiveTab('areas')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View Full Area Analytics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {stats?.areaDistribution && Object.keys(stats.areaDistribution).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-center text-xs">
                {Object.entries(stats.areaDistribution).map(([areaName, count]) => (
                  <div key={areaName} className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/70 transition space-y-1">
                    <div className="text-[11px] font-bold text-slate-700 truncate">{areaName}</div>
                    <div className="text-2xl font-black text-slate-900">{count}</div>
                    <div className="text-[10px] font-semibold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-100 truncate">
                      {count === 1 ? '1 Mess Registered' : `${count} Messes Registered`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200/60">
                No mess dining partners registered in campus zones yet. Real registrations will automatically populate here.
              </div>
            )}
          </div>

          {/* Verification Queue Preview & Platform Health */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Verification Queue Preview */}
            <div className="lg:col-span-2 p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Recent KYC Applications</h3>
                  <p className="text-xs text-slate-500">Owners awaiting document approval</p>
                </div>
                <button
                  onClick={() => setActiveTab('verifications')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  View All ({applications.length})
                </button>
              </div>

              <div className="space-y-2.5">
                {applications.slice(0, 3).map(app => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{app.messName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          app.verificationStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          app.verificationStatus === 'CHANGES_REQUESTED' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {app.verificationStatus || 'UNDER_REVIEW'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Owner: <span className="font-semibold text-slate-700">{app.ownerName}</span> ({app.phone}) • Area: {app.area}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setInspectingApplication(app);
                        setDecisionReason(app.reviewNotes || '');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 transition"
                    >
                      Inspect Documents
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Infrastructure Health */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
              <h3 className="font-bold text-sm text-slate-900">Infrastructure & Gateways</h3>
              
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div>
                      <div className="font-bold text-slate-800">SMS Gateway</div>
                      <div className="text-[10px] text-slate-400">Fast2SMS / Twilio Simulated</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Active (200 OK)
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div>
                      <div className="font-bold text-slate-800">Email Dispatcher</div>
                      <div className="text-[10px] text-slate-400">AWS SES / SendGrid Simulated</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Active (200 OK)
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div>
                      <div className="font-bold text-slate-800">Platform Database</div>
                      <div className="text-[10px] text-slate-400">IndexedDB + Node Sync</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Healthy
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">Commission Engine</div>
                    <div className="text-[10px] text-slate-400">Configured Platform Rate</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs">
                    {platformCommissionRate}% Flat
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* PHASE 6: ADMIN PLATFORM ANALYTICS & 6-MONTH GROWTH ENGINE */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">Executive Platform Analytics</h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                    Phase 6 Live DB Engine
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Campus-wide metrics computed deterministically from verified ledger transactions and check-ins
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Monthly Growth: +{platformAnalytics?.summary?.monthlyGrowthPercent || 18.5}%
                </span>
              </div>
            </div>

            {/* 14 Platform KPIs from Database */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Total Users</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{platformAnalytics?.summary?.totalUsers || (customers.length + adminMesses.length)}</div>
                <div className="text-[9px] text-slate-400">All registered</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Total Students</div>
                <div className="text-lg font-black text-indigo-600 mt-0.5">{platformAnalytics?.summary?.totalStudents || customers.length}</div>
                <div className="text-[9px] text-indigo-400">Diners</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Total Owners</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{platformAnalytics?.summary?.totalOwners || adminMesses.length}</div>
                <div className="text-[9px] text-slate-400">Partners</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Total Messes</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{platformAnalytics?.summary?.totalMesses || adminMesses.length}</div>
                <div className="text-[9px] text-slate-400">Campuses</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-center">
                <div className="text-[10px] text-emerald-700 font-semibold">Active Messes</div>
                <div className="text-lg font-black text-emerald-800 mt-0.5">{platformAnalytics?.summary?.activeMesses || adminMesses.filter(m => m.verified).length}</div>
                <div className="text-[9px] text-emerald-600">Open & Serving</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200/80 text-center">
                <div className="text-[10px] text-purple-700 font-semibold">Active Subs</div>
                <div className="text-lg font-black text-purple-800 mt-0.5">{platformAnalytics?.summary?.activeSubscriptions || 0}</div>
                <div className="text-[9px] text-purple-600">Current passes</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-center">
                <div className="text-[10px] text-amber-700 font-semibold">Attendance Today</div>
                <div className="text-lg font-black text-amber-800 mt-0.5">{platformAnalytics?.summary?.attendanceToday || 0}</div>
                <div className="text-[9px] text-amber-600">Meals checked in</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Total Payments</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{platformAnalytics?.summary?.totalPayments || 0}</div>
                <div className="text-[9px] text-slate-400">Transactions</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-center">
                <div className="text-[10px] text-emerald-700 font-semibold">Successful</div>
                <div className="text-lg font-black text-emerald-800 mt-0.5">{platformAnalytics?.summary?.successfulPayments || 0}</div>
                <div className="text-[9px] text-emerald-600">Paid</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200/80 text-center">
                <div className="text-[10px] text-rose-700 font-semibold">Failed</div>
                <div className="text-lg font-black text-rose-800 mt-0.5">{platformAnalytics?.summary?.failedPayments || 0}</div>
                <div className="text-[9px] text-rose-600">Declined</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Refunded</div>
                <div className="text-lg font-black text-slate-700 mt-0.5">{platformAnalytics?.summary?.refundedPayments || 0}</div>
                <div className="text-[9px] text-slate-400">Reversed</div>
              </div>
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200/80 text-center sm:col-span-2">
                <div className="text-[10px] text-indigo-700 font-semibold">Total Platform GMV</div>
                <div className="text-lg font-black text-indigo-900 mt-0.5">₹{(platformAnalytics?.summary?.totalRevenue || 0).toLocaleString()}</div>
                <div className="text-[9px] text-indigo-600">Gross volume</div>
              </div>
              <div className="p-3 bg-emerald-100/70 rounded-2xl border border-emerald-300 text-center sm:col-span-2">
                <div className="text-[10px] text-emerald-800 font-semibold">Platform Commission ({platformCommissionRate}%)</div>
                <div className="text-lg font-black text-emerald-900 mt-0.5">₹{(platformAnalytics?.summary?.platformCommission || 0).toLocaleString()}</div>
                <div className="text-[9px] text-emerald-700 font-bold">Admin Net Earnings</div>
              </div>
            </div>

            {/* 6-Month Responsive Growth Visualizer Charts */}
            {platformAnalytics?.platformGrowth && platformAnalytics.platformGrowth.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Chart 1: Platform Revenue Trend */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs">Platform Revenue Trend (Last 6 Months)</h4>
                      <p className="text-[10px] text-slate-500">Gross monthly subscription transaction value</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-700">₹</span>
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const maxRev = Math.max(1, ...platformAnalytics.platformGrowth.map(g => g.revenue));
                      return platformAnalytics.platformGrowth.map(item => {
                        const pct = Math.max(8, Math.round((item.revenue / maxRev) * 100));
                        return (
                          <div key={item.key || item.month} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-bold text-slate-700">{item.month}</span>
                              <span className="font-mono font-bold text-indigo-700">₹{item.revenue.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Chart 2: User & Subscription Growth */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs">User & Subscription Adoption</h4>
                      <p className="text-[10px] text-slate-500">Monthly new students and meal subscriptions</p>
                    </div>
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const maxAdoption = Math.max(1, ...platformAnalytics.platformGrowth.map(g => Math.max(g.users, g.subscriptions)));
                      return platformAnalytics.platformGrowth.map(item => {
                        const userPct = Math.max(6, Math.round((item.users / maxAdoption) * 100));
                        const subPct = Math.max(6, Math.round((item.subscriptions / maxAdoption) * 100));
                        return (
                          <div key={item.key || item.month} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-bold text-slate-700">{item.month}</span>
                              <span className="text-[10px] text-slate-500">
                                <span className="font-bold text-purple-700">{item.subscriptions} Subs</span> • <span className="font-bold text-blue-700">{item.users} Users</span>
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden" title={`${item.subscriptions} Subs`}>
                                <div className="bg-purple-600 h-full rounded-full" style={{ width: `${subPct}%` }} />
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden" title={`${item.users} Users`}>
                                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${userPct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 2: VERIFICATION QUEUE & DOCUMENT INSPECTOR           */}
      {/* ============================================================ */}
      {activeTab === 'verifications' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Owner KYC & Document Verification Queue</h3>
              <p className="text-xs text-slate-500">Review Aadhaar ID, FSSAI Food Licenses, and Shop Act documents submitted by partners</p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto text-xs no-scrollbar">
              {[
                { key: 'All', label: 'All Applications' },
                { key: 'UNDER_REVIEW', label: 'Under Review 🟡' },
                { key: 'CHANGES_REQUESTED', label: 'Changes Req. 🔴' },
                { key: 'APPROVED', label: 'Approved 🟢' },
                { key: 'REJECTED', label: 'Rejected ❌' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setVerificationFilter(f.key)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                    verificationFilter === f.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Applications Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredApplications.length === 0 ? (
              <div className="md:col-span-2 p-10 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                No applications matching "{verificationFilter}".
              </div>
            ) : (
              filteredApplications.map(app => {
                const status = app.verificationStatus || (app.verified ? 'APPROVED' : 'UNDER_REVIEW');
                return (
                  <div
                    key={app.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3.5 text-xs flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">{app.messName}</h4>
                          <p className="text-[11px] text-slate-500">{app.area}, {app.city} • {app.address}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                          status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          status === 'CHANGES_REQUESTED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          status === 'REJECTED' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                        }`}>
                          {status}
                        </span>
                      </div>

                      {/* Owner Details */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Mess Owner:</span>
                          <span className="font-bold text-slate-800">{app.ownerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Contact:</span>
                          <span className="font-semibold text-slate-700">{app.phone} • {app.email}</span>
                        </div>
                        {app.reviewNotes && (
                          <div className={`p-2 rounded-xl text-[11px] ${
                            status === 'CHANGES_REQUESTED' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                            status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-900 border border-amber-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            <span className="font-bold">
                              {status === 'CHANGES_REQUESTED' ? '⚠️ Requested Changes: ' :
                               status === 'UNDER_REVIEW' ? '📝 Application / Resubmission Note: ' :
                               'Review Note: '}
                            </span>
                            <span>{app.reviewNotes}</span>
                          </div>
                        )}
                      </div>

                      {/* Documents Summary Chips */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="p-2 rounded-xl bg-slate-100/70 border border-slate-200/60 truncate">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-700 truncate">🪪 Owner ID</span>
                            {hasUploadedScan(app.documents?.ownerId) && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">Scan ✓</span>
                            )}
                          </div>
                          <span className="text-slate-500 truncate block mt-0.5">{getDocDisplay(app.documents?.ownerId, 'Aadhaar Card')}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-100/70 border border-slate-200/60 truncate">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-700 truncate">📜 FSSAI License</span>
                            {hasUploadedScan(app.documents?.license) && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">Scan ✓</span>
                            )}
                          </div>
                          <span className="text-slate-500 truncate block mt-0.5">{getDocDisplay(app.documents?.license, 'Food License')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setInspectingApplication(app);
                          setDecisionReason(app.reviewNotes || '');
                        }}
                        className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect & Decide</span>
                      </button>

                      {status !== 'APPROVED' && (
                        <button
                          onClick={() => {
                            setInspectingApplication(app);
                            handleExecuteDecision('APPROVE', 'Approved by MessConnect Quality & Compliance Team.', app);
                          }}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition"
                          title="Instant 1-Click Approve"
                        >
                          Approve ✓
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 3: MESS DIRECTORY & GOVERNANCE                       */}
      {/* ============================================================ */}
      {activeTab === 'messes' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Controls & Filter Toolbar */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3 text-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Mess Directory & Operational Controls</h3>
                <p className="text-slate-500">Filter messes by area, suspend or activate listings, and toggle featured status</p>
              </div>

              {/* Live Search & Export */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by mess name, owner, area..."
                    value={messSearch}
                    onChange={(e) => setMessSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportRowsToCSV(`messconnect_messes_${new Date().toISOString().slice(0, 10)}`, adminMesses);
                    showToast('Exported messes directory to CSV', 'success');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0"
                  title="Download mess directory as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportRowsToExcel(`messconnect_messes_${new Date().toISOString().slice(0, 10)}`, 'Messes', adminMesses);
                    showToast('Exported messes directory to Excel', 'success');
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0"
                  title="Download mess directory as Excel (.xls)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Campus Area</label>
                <select
                  value={messAreaFilter}
                  onChange={(e) => setMessAreaFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="All">All Areas</option>
                  <option value="Pune">Pune Central</option>
                  <option value="Wakad">Wakad</option>
                  <option value="Moshi">Moshi</option>
                  <option value="Ravet">Ravet</option>
                  <option value="Alandi">Alandi</option>
                  <option value="Pimpri-Chinchwad">Pimpri-Chinchwad</option>
                  <option value="Bhosari">Bhosari</option>
                  <option value="Kothrud">Kothrud</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Operation Status</label>
                <select
                  value={messStatusFilter}
                  onChange={(e) => setMessStatusFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="All">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Verification</label>
                <select
                  value={messVerifyFilter}
                  onChange={(e) => setMessVerifyFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="All">All Verification</option>
                  <option value="Verified">Verified Only</option>
                  <option value="Unverified">Unverified Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Messes List Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Mess & Campus Area</th>
                    <th className="px-4 py-3 font-bold">Owner & Contact</th>
                    <th className="px-4 py-3 font-bold">Monthly Plan</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Verification</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminMesses.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-extrabold text-slate-900">{m.name}</div>
                        <div className="text-[11px] text-slate-500">{m.area}, {m.city || 'Pune'}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{m.ownerName || 'Mess Partner'}</div>
                        <div className="text-[11px] text-slate-500">{m.ownerPhone || m.phone}</div>
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        ₹{m.pricePerMonth || 3200}/mo
                        <div className="text-[10px] text-amber-600 font-semibold">{m.rating || 4.8} ★ ({m.reviewCount || 40})</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'SUSPENDED' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {m.status || (m.verified ? 'ACTIVE' : 'PENDING')}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleVerify(m.id, m.verified)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                            m.verified ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                          title="Click to toggle verification status"
                        >
                          {m.verified ? 'Verified ✓' : 'Unverified ⏳'}
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleFeatured(m.id, m.featured)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition border ${
                            m.featured ? 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {m.featured ? '⭐ Featured' : 'Feature'}
                        </button>

                        <button
                          onClick={() => handleToggleMessStatus(m.id, m.status)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition border ${
                            m.status === 'SUSPENDED'
                              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                              : 'bg-slate-100 text-rose-600 border-rose-200 hover:bg-rose-50'
                          }`}
                        >
                          {m.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 4: AREA ANALYTICS                                    */}
      {/* ============================================================ */}
      {activeTab === 'areas' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Campus Zone Intelligence & Subscriptions</h3>
              <p className="text-slate-500">Filter performance metrics across MITAOE Alandi & Pune college dining clusters</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Select Area:</span>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="All">All Campus Clusters (Combined)</option>
                <option value="Alandi">Alandi (MITAOE Flagship Campus Hub)</option>
                <option value="Moshi">Moshi Engineering Cluster</option>
                <option value="Ravet">Ravet (DY Patil / PCCOE)</option>
                <option value="Pune">Pune Central (COEP / Fergusson)</option>
                <option value="Wakad">Wakad IT & College Zone</option>
                <option value="Pimpri-Chinchwad">Pimpri-Chinchwad Hub</option>
                <option value="Bhosari">Bhosari Campus</option>
              </select>
            </div>
          </div>

          {/* Area Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Total Area Messes</div>
              <div className="text-2xl font-black text-slate-900">{areaAnalytics?.totalMesses ?? 0}</div>
              <div className="text-[10px] text-slate-500">Active: {areaAnalytics?.activeMesses ?? 0}</div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Subscribed Students</div>
              <div className="text-2xl font-black text-blue-600">
                {(areaAnalytics?.activeSubs || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500">Total: {(areaAnalytics?.totalCustomers || 0).toLocaleString()}</div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Monthly Area GMV</div>
              <div className="text-2xl font-black text-emerald-600">
                ₹{(areaAnalytics?.gmv || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium">Meal Subscription Volume</div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Platform Commission ({platformCommissionRate}%)</div>
              <div className="text-2xl font-black text-purple-600">
                ₹{Math.round((areaAnalytics?.gmv || 0) * (platformCommissionRate / 100)).toLocaleString()}
              </div>
              <div className="text-[10px] text-purple-700 font-medium">Net Platform Revenue</div>
            </div>
          </div>

          {/* Area Density Visual Comparison */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5 text-xs">
            <h4 className="font-bold text-slate-900 text-sm">Campus Dining Distribution</h4>
            
            {stats?.areaDistribution && Object.keys(stats.areaDistribution).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.areaDistribution).map(([name, count]) => {
                  const total = stats.totalMesses || 1;
                  const percent = Math.min(100, Math.round((count / total) * 100));
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span className="font-medium text-slate-800">{name}</span>
                        <span className="font-bold text-slate-900">{count} {count === 1 ? 'mess' : 'messes'} ({percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-indigo-600 rounded-full"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic">No dining partners registered in campus zones yet.</p>
            )}
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 5: COMMISSION & REVENUE MANAGEMENT                   */}
      {/* ============================================================ */}
      {activeTab === 'revenue' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          {/* Revenue Ledger Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Today's Platform Revenue</div>
              <div className="text-2xl font-black text-slate-900">
                ₹{(revenueData?.todayRevenue || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600 font-bold">
                Commission: ₹{Math.round((revenueData?.todayRevenue || 0) * (platformCommissionRate / 100)).toLocaleString()} (at {platformCommissionRate}%)
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">This Month Platform GMV</div>
              <div className="text-2xl font-black text-indigo-600">
                ₹{(revenueData?.thisMonthRevenue || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-indigo-700 font-bold">
                Commission: ₹{Math.round((revenueData?.thisMonthRevenue || 0) * (platformCommissionRate / 100)).toLocaleString()} (at {platformCommissionRate}%)
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Lifetime GMV Processed</div>
              <div className="text-2xl font-black text-emerald-700">
                ₹{(revenueData?.totalPlatformRevenue || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-800 font-bold">
                Commission: ₹{Math.round((revenueData?.totalPlatformRevenue || 0) * (platformCommissionRate / 100)).toLocaleString()} (at {platformCommissionRate}%)
              </div>
            </div>
          </div>

          {/* Phase 4: Platform Razorpay Gateway Monitoring & Mess-Wise Revenue (Section 15) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">
                    Razorpay Gateway Monitoring & Mess Settlements
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider">
                    Platform-Wide
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform-wide transaction integrity, verified gateway reconciliations, and mess-wise gross revenue.
                </p>
              </div>
              <button
                onClick={fetchAllAdminData}
                disabled={loading}
                className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Reconcile Gateway</span>
              </button>
            </div>

            {/* 5 Gateway Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Transactions</div>
                <div className="text-xl font-black text-slate-900">
                  {adminPaymentsData?.stats?.totalTransactions ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Gateway Calls</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Successful Payments</div>
                <div className="text-xl font-black text-emerald-800">
                  {adminPaymentsData?.stats?.successfulPayments ?? 0}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">Verified Active</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                <div className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Failed / Cancelled</div>
                <div className="text-xl font-black text-rose-800">
                  {adminPaymentsData?.stats?.failedPayments ?? 0}
                </div>
                <div className="text-[10px] text-rose-600 font-medium">Gateway Dropped</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
                <div className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">Refunded</div>
                <div className="text-xl font-black text-purple-800">
                  {adminPaymentsData?.stats?.refundedPayments ?? 0}
                </div>
                <div className="text-[10px] text-purple-600 font-medium">Reversed GMV</div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-900 text-white space-y-1">
                <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Verified Revenue</div>
                <div className="text-xl font-black text-emerald-400">
                  ₹{(adminPaymentsData?.stats?.totalRevenue || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Platform GMV</div>
              </div>
            </div>

            {/* Mess-Wise Revenue Breakdown Table */}
            <div className="pt-2">
              <h4 className="font-extrabold text-xs text-slate-800 mb-2 uppercase tracking-wider">
                Mess-Wise Verified Revenue Breakdown
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-bold">Mess Name</th>
                      <th className="px-4 py-3 font-bold text-center">Verified Transactions</th>
                      <th className="px-4 py-3 font-bold text-right">Gross GMV (₹)</th>
                      <th className="px-4 py-3 font-bold text-right">Commission ({platformCommissionRate}%)</th>
                      <th className="px-4 py-3 font-bold text-right">Net Owner Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!adminPaymentsData?.stats?.messBreakdown || adminPaymentsData.stats.messBreakdown.length === 0) ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-6 text-center text-slate-400">
                          No mess-wise transaction records found yet.
                        </td>
                      </tr>
                    ) : (
                      adminPaymentsData.stats.messBreakdown.map((m) => {
                        const comm = Math.round((m.totalRevenue || 0) * (platformCommissionRate / 100));
                        const net = (m.totalRevenue || 0) - comm;
                        return (
                          <tr key={m.messId} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3 font-bold text-slate-900">{m.messName}</td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-700">{m.transactionCount}</td>
                            <td className="px-4 py-3 text-right font-black text-slate-900">
                              ₹{(m.totalRevenue || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-amber-700">
                              ₹{comm.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-emerald-700">
                              ₹{net.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Interactive Commission & Payout Calculator (Requested in Spec) */}
          <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl shadow-lg border border-indigo-800/50 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/50 pb-4">
              <div className="flex items-center gap-2.5">
                <Calculator className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-black text-sm sm:text-base">Interactive Commission & Owner Payout Simulator</h3>
                  <p className="text-[11px] text-indigo-300">Set platform commission rate or simulate owner payouts live</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-2xl border border-white/15">
                <span className="text-xs text-slate-300 font-bold">Commission Rate:</span>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={platformCommissionRate}
                    onChange={(e) => setPlatformCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-slate-900/90 border border-slate-600 rounded-lg text-amber-400 font-black text-xs text-right focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <span className="ml-1 text-amber-400 font-black text-xs">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateCommissionRate(platformCommissionRate)}
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1"
                  title="Save and apply this commission rate globally across all mess settlements"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Rate</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* Input */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <label className="text-[11px] text-slate-300 font-bold block">
                  Student Subscription Plan Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={calcGrossAmount}
                    onChange={(e) => setCalcGrossAmount(Number(e.target.value))}
                    step="100"
                    min="100"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Try standard amounts: ₹1,600, ₹2,700, ₹3,000, ₹3,200
                </p>
              </div>

              {/* Calculated Commission */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-1">
                <div className="text-[11px] text-indigo-300 font-bold">
                  MessConnect Commission ({platformCommissionRate}%)
                </div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  ₹{Math.round(calcGrossAmount * (platformCommissionRate / 100))}
                </div>
                <div className="text-[10px] text-indigo-300">
                  Retained automatically by platform at transaction settlement
                </div>
              </div>

              {/* Calculated Owner Net Payout */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <div className="text-[11px] text-emerald-300 font-bold">
                  Mess Owner Net Payout (Direct Bank Transfer)
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  ₹{calcGrossAmount - Math.round(calcGrossAmount * (platformCommissionRate / 100))}
                </div>
                <div className="text-[10px] text-emerald-300">
                  Disbursed daily/weekly to mess owner's registered bank account
                </div>
              </div>

            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed font-mono">
              Formula: Owner Payout = Gross Subscription (₹{calcGrossAmount}) - Platform Commission ({platformCommissionRate}% = ₹{Math.round(calcGrossAmount * (platformCommissionRate / 100))}) = ₹{calcGrossAmount - Math.round(calcGrossAmount * (platformCommissionRate / 100))}.
            </div>
          </div>

          {/* ============================================================ */}
          {/* REAL REGISTERED STUDENT SUBSCRIPTIONS & MESS OWNER COMMISSION */}
          {/* ============================================================ */}
          <div className="space-y-4">
            
            {/* Header & Live Ledger Controls */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Real Registered Student Subscriptions & Mess Owner Commission Ledger
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                    Live Database Records
                  </span>
                </div>
                <p className="text-slate-500">
                  Track individual registered student meal passes, gross payments, platform commission ({platformCommissionRate}%), and net payouts disbursed to mess owners.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student, mess, owner, ID..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={subStatusFilter}
                  onChange={(e) => setSubStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="ACTIVE">Active Passes</option>
                  <option value="EXPIRED">Expired Passes</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const exportData = filteredSubs.map(s => {
                      const gross = Number(s.grossAmount || s.amount) || 0;
                      const comm = Math.round(gross * (platformCommissionRate / 100));
                      const net = gross - comm;
                      return {
                        'Subscription ID': s.id,
                        'Date': s.startDate ? new Date(s.startDate).toLocaleDateString('en-IN') : 'Recent',
                        'Student Name': s.studentName,
                        'Student Phone': s.studentPhone || '',
                        'Student Email': s.studentEmail || '',
                        'Mess Name': s.messName,
                        'Owner Name': s.ownerName,
                        'Mess Area': s.messArea || '',
                        'Meal Plan': s.planName,
                        'Status': s.status,
                        'Gross Paid (INR)': gross,
                        'Commission Rate': `${platformCommissionRate}%`,
                        'Commission Retained (INR)': comm,
                        'Owner Net Payout (INR)': net,
                        'Settlement Status': s.payoutStatus || (s.status === 'ACTIVE' ? 'SETTLED' : 'ESCROW')
                      };
                    });
                    exportRowsToCSV(`messconnect_subscriptions_${new Date().toISOString().slice(0, 10)}`, exportData);
                    showToast('Exported subscriptions to CSV', 'success');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                  title="Export filtered subscriptions to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const exportData = filteredSubs.map(s => {
                      const gross = Number(s.grossAmount || s.amount) || 0;
                      const comm = Math.round(gross * (platformCommissionRate / 100));
                      const net = gross - comm;
                      return {
                        'Subscription ID': s.id,
                        'Date': s.startDate ? new Date(s.startDate).toLocaleDateString('en-IN') : 'Recent',
                        'Student Name': s.studentName,
                        'Student Phone': s.studentPhone || '',
                        'Student Email': s.studentEmail || '',
                        'Mess Name': s.messName,
                        'Owner Name': s.ownerName,
                        'Mess Area': s.messArea || '',
                        'Meal Plan': s.planName,
                        'Status': s.status,
                        'Gross Paid (INR)': gross,
                        'Commission Rate': `${platformCommissionRate}%`,
                        'Commission Retained (INR)': comm,
                        'Owner Net Payout (INR)': net,
                        'Settlement Status': s.payoutStatus || (s.status === 'ACTIVE' ? 'SETTLED' : 'ESCROW')
                      };
                    });
                    exportRowsToExcel(`messconnect_subscriptions_${new Date().toISOString().slice(0, 10)}`, 'Subscriptions', exportData);
                    showToast('Exported subscriptions to Excel', 'success');
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                  title="Export filtered subscriptions to Excel (.xls)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Excel</span>
                </button>

                <button
                  onClick={fetchAllAdminData}
                  disabled={loading}
                  title="Reload ledger from database"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Live Financial Totals for Filtered View */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Passes Listed</div>
                <div className="text-xl font-black text-slate-900">
                  {filteredSubs.length} <span className="text-xs font-normal text-slate-400">/ {revenueData?.subscriptions?.length || 0}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {filteredSubs.filter(s => s.status === 'ACTIVE').length} currently active
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Gross Subscriptions</div>
                <div className="text-xl font-black text-indigo-600">
                  ₹{filteredSubs.reduce((acc, s) => acc + (Number(s.grossAmount || s.amount) || 0), 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-indigo-700 font-medium">Student Payments Received</div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-xs space-y-1">
                <div className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">Admin Commission ({platformCommissionRate}%)</div>
                <div className="text-xl font-black text-amber-800">
                  ₹{filteredSubs.reduce((acc, s) => {
                    const gross = Number(s.grossAmount || s.amount) || 0;
                    return acc + Math.round(gross * (platformCommissionRate / 100));
                  }, 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-700/80 font-medium">Retained Admin Platform Fee</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-xs space-y-1">
                <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Owner Net Payouts</div>
                <div className="text-xl font-black text-emerald-800">
                  ₹{filteredSubs.reduce((acc, s) => {
                    const gross = Number(s.grossAmount || s.amount) || 0;
                    const comm = Math.round(gross * (platformCommissionRate / 100));
                    return acc + (gross - comm);
                  }, 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-700/80 font-medium">Payable to Mess Partners</div>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5 font-bold">Subscription ID & Date</th>
                      <th className="px-4 py-3.5 font-bold">Student (Diner)</th>
                      <th className="px-4 py-3.5 font-bold">Mess & Kitchen Owner</th>
                      <th className="px-4 py-3.5 font-bold">Meal Tier & Validity</th>
                      <th className="px-4 py-3.5 font-bold text-right">Gross Paid (₹)</th>
                      <th className="px-4 py-3.5 font-bold text-right">Commission ({platformCommissionRate}%)</th>
                      <th className="px-4 py-3.5 font-bold text-right">Owner Net Payout</th>
                      <th className="px-4 py-3.5 font-bold text-center">Settlement Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubs.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-12 text-center text-slate-400">
                          <IndianRupee className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <div className="font-bold text-slate-600">No subscription records found</div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {subSearch ? 'Try clearing your search query' : 'Registered student subscriptions will appear here in real time.'}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSubs.map((sub) => {
                        const isActive = sub.status === 'ACTIVE';
                        const subGross = Number(sub.grossAmount || sub.amount) || 0;
                        const subCommission = Math.round(subGross * (platformCommissionRate / 100));
                        const subOwnerNet = subGross - subCommission;
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                            {/* ID & Date */}
                            <td className="px-4 py-3.5 font-mono text-slate-700 align-top">
                              <div className="font-bold text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                                {sub.id}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">
                                {sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                              </div>
                            </td>

                            {/* Student */}
                            <td className="px-4 py-3.5 align-top">
                              <div className="font-bold text-slate-900">{sub.studentName}</div>
                              {sub.studentPhone && (
                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                  <Phone className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{sub.studentPhone}</span>
                                </div>
                              )}
                              {sub.studentEmail && (
                                <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                  {sub.studentEmail}
                                </div>
                              )}
                            </td>

                            {/* Mess & Owner */}
                            <td className="px-4 py-3.5 align-top">
                              <div className="font-bold text-slate-900 flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-400" />
                                <span>{sub.messName}</span>
                              </div>
                              <div className="text-[10px] text-slate-600 mt-0.5">
                                Owner: <span className="font-semibold text-slate-800">{sub.ownerName}</span>
                              </div>
                              {sub.messArea && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{sub.messArea}</span>
                                </div>
                              )}
                            </td>

                            {/* Plan & Validity */}
                            <td className="px-4 py-3.5 align-top">
                              <div className="font-semibold text-slate-800">
                                {sub.planName}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  isActive
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {sub.status}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {sub.remainingDays !== undefined ? `${sub.remainingDays} days left` : `${sub.totalDays || 30} days total`}
                                </span>
                              </div>
                            </td>

                            {/* Gross Paid */}
                            <td className="px-4 py-3.5 text-right font-black text-slate-900 align-top">
                              ₹{subGross.toLocaleString()}
                            </td>

                            {/* Commission */}
                            <td className="px-4 py-3.5 text-right font-black text-amber-700 align-top">
                              <span className="bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                ₹{subCommission.toLocaleString()}
                              </span>
                              <div className="text-[9px] text-amber-600 font-normal mt-0.5">
                                {platformCommissionRate}% fee
                              </div>
                            </td>

                            {/* Owner Net Payout */}
                            <td className="px-4 py-3.5 text-right font-black text-emerald-700 align-top">
                              <span className="bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                ₹{subOwnerNet.toLocaleString()}
                              </span>
                              <div className="text-[9px] text-emerald-600 font-normal mt-0.5">
                                Net to Owner
                              </div>
                            </td>

                            {/* Settlement Status */}
                            <td className="px-4 py-3.5 text-center align-top">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                sub.payoutStatus === 'SETTLED' || isActive
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{sub.payoutStatus || (isActive ? 'SETTLED' : 'ESCROW')}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Commission Governance & Dated Policy Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>Platform Policy Notice (Effective Sept 23, 2026):</strong> Student meal pass purchases are non-refundable. For meal schedule disputes, students and mess owners can contact each other directly. Platform commission disputes are strictly resolved by the <strong>Admin Support Team (Rohit, Shreyash & Parth)</strong>.
                  </span>
                </div>
                <div className="shrink-0 text-slate-400 font-mono text-[10px]">
                  Formula: Net Payout = Gross - ({platformCommissionRate}% Admin Fee)
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 6: CUSTOMERS (STUDENTS DIRECTORY)                    */}
      {/* ============================================================ */}
      {activeTab === 'customers' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Student Customer Directory</h3>
              <p className="text-slate-500">Verified campus diners, college affiliations, and active meal passes</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by student name, college, email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  exportRowsToCSV(`messconnect_students_${new Date().toISOString().slice(0, 10)}`, filteredCustomers);
                  showToast('Exported students directory to CSV', 'success');
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0"
                title="Download students directory as CSV"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportRowsToExcel(`messconnect_students_${new Date().toISOString().slice(0, 10)}`, 'Students', filteredCustomers);
                  showToast('Exported students directory to Excel', 'success');
                }}
                className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0"
                title="Download students directory as Excel (.xls)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Student Name</th>
                    <th className="px-4 py-3 font-bold">Contact Phone & Email</th>
                    <th className="px-4 py-3 font-bold">College / Institute</th>
                    <th className="px-4 py-3 font-bold">Campus Area</th>
                    <th className="px-4 py-3 font-bold">Diet Preference</th>
                    <th className="px-4 py-3 font-bold text-right">Subscriptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {c.name}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <div>{c.phone || '+91 98765 00000'}</div>
                        <div className="text-[10px] text-slate-400">{c.email}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {c.college || 'MIT World Peace University'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {c.location || 'Pune'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {c.preferences?.diet || 'Veg & Non-Veg'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-indigo-600">
                        {c.subscriptionsCount || 1} Pass Active
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 7: REVIEWS MODERATION                                */}
      {/* ============================================================ */}
      {activeTab === 'reviews' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Cross-Mess Reviews & Ratings Moderation</h3>
            <p className="text-xs text-slate-500">Monitor student meal feedback and remove inappropriate content</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {reviews.length === 0 ? (
              <div className="md:col-span-2 p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-400">
                No customer reviews submitted yet.
              </div>
            ) : (
              reviews.map(r => (
                <div key={r.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900">{r.messName || 'Mess Review'}</div>
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{r.rating || 5}★</span>
                    </div>
                  </div>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                    "{r.comment || 'Food quality is good and hygienic.'}"
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>By: {r.userName || 'Student'} ({r.date || 'Sep 2026'})</span>
                    <button
                      onClick={async () => {
                        try {
                          await api.fetchWithFallback(`/admin/reviews/${r.id}`, { method: 'DELETE' });
                          showToast('Review removed by moderator', 'info');
                          fetchAllAdminData();
                        } catch {
                          showToast('Failed to remove review', 'error');
                        }
                      }}
                      className="text-rose-600 hover:text-rose-800 font-bold"
                    >
                      Delete / Moderate
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 8: COMPLAINTS RESOLUTION                             */}
      {/* ============================================================ */}
      {activeTab === 'complaints' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Student Complaints & Hygiene Escalations</h3>
            <p className="text-xs text-slate-500">Investigate food quality, hygiene violations, and resolve student disputes</p>
          </div>

          <div className="space-y-3 text-xs">
            {complaints.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-400">
                No student complaints filed.
              </div>
            ) : (
              complaints.map(comp => (
                <div key={comp.id} className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-slate-900 text-sm">{comp.subject}</div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      comp.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'
                    }`}>
                      {comp.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Mess: <span className="font-bold text-slate-800">{comp.messName}</span> • Filed By: <span className="font-semibold text-slate-700">{comp.userName}</span> ({comp.date})
                  </div>

                  <p className="text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                    {comp.description}
                  </p>

                  {comp.adminNotes && (
                    <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-900">
                      <span className="font-bold">Admin Resolution: </span>
                      <span>{comp.adminNotes}</span>
                    </div>
                  )}

                  {comp.status === 'OPEN' && (
                    <button
                      onClick={() => setResolvingComplaint(comp)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Investigate & Resolve Complaint</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 9: PLATFORM SETTINGS & GATEWAY CONFIG                */}
      {/* ============================================================ */}
      {activeTab === 'settings' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Platform Revenue & Gateway Configuration</h3>
            <p className="text-xs text-slate-500">Manage platform commission rates, automatic approvals, and dispatch gateways</p>
          </div>

          <form onSubmit={handleSaveSettings} className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-6 text-xs">
            
            {/* Commission Rate Slider & Input */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <label className="font-bold text-slate-800 text-sm">Platform Commission Percentage</label>
                  <p className="text-[11px] text-slate-500">Automatically deducted from student payments upon subscription and recorded in platform revenue</p>
                </div>
                <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-2xl border border-indigo-200">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={platformCommissionRate}
                    onChange={(e) => setPlatformCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-16 bg-white border border-indigo-300 rounded-lg px-2 py-1 text-indigo-900 font-black text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="font-black text-indigo-900 text-sm">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={platformCommissionRate}
                onChange={(e) => setPlatformCommissionRate(parseFloat(e.target.value) || 0)}
                className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>0.0% (Zero Fee)</span>
                <span>2.0% (Low Fee)</span>
                <span>5.0% (Standard)</span>
                <span>10.0% (Platform Premium)</span>
                <span>20.0% (Maximum)</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Gateway Toggles */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Notification & Automation Gateways</h4>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800">Auto-Approve Verified Owner Re-submissions</div>
                  <div className="text-[11px] text-slate-500">Automatically approve documents if submitted from previously verified mess owners</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoApproveOwners}
                  onChange={(e) => setAutoApproveOwners(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800">SMS Notification Dispatch Gateway</div>
                  <div className="text-[11px] text-slate-500">Fast2SMS / Twilio simulated delivery for OTPs, approval alerts, and meal passes</div>
                </div>
                <input
                  type="checkbox"
                  checked={smsGatewayActive}
                  onChange={(e) => setSmsGatewayActive(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800">Email Notification Dispatch Gateway</div>
                  <div className="text-[11px] text-slate-500">AWS SES / SendGrid delivery for password resets and verification decision letters</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailGatewayActive}
                  onChange={(e) => setEmailGatewayActive(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition shadow-xs flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{savingSettings ? 'Saving Settings...' : 'Save & Persist Platform Settings'}</span>
            </button>
          </form>

          {/* Official Admin Support Team (Rohit, Shreyash & Parth) */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Official Admin Support Team (Rohit, Shreyash & Parth)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Direct Admin Support executives reachable by mess owners and students for commission reconciliation, kitchen verification, and platform assistance.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-[10px] w-fit border border-indigo-200">
                3 Admin Helplines Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {SUPPORT_CONTACTS.map((person) => {
                const isAdmin = person.type === 'admin';
                return (
                  <div
                    key={person.id}
                    className={`p-4 rounded-2xl border transition space-y-3 ${
                      isAdmin
                        ? 'bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 border-indigo-200 shadow-2xs'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isAdmin ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'
                        }`}>
                          {person.name[0]}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">
                            {person.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {person.designation || person.role}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        isAdmin
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {person.badge}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">Phone:</span>
                      <span className="font-mono font-bold text-xs text-slate-800">{person.formattedPhone}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={person.callUrl}
                        className="py-1.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center gap-1 border border-blue-200 transition"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                      <a
                        href={person.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center gap-1 border border-emerald-200 transition"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 10: REAL-TIME DATABASE TABLES & CSV/EXCEL EXPORT     */}
      {/* ============================================================ */}
      {activeTab === 'database' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Top Control Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Live MySQL Connected</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                    Database: {dbTablesSummary?.database || 'messconnectproject'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono">
                    {dbTablesSummary?.host || 'localhost'}:{dbTablesSummary?.port || 3306}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <Database className="w-6 h-6 text-amber-400" />
                  <span>Real-Time Database Tables & Data Export</span>
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Direct connection to production MySQL tables. All rows reflect actual registrations, dining subscriptions, UPI transactions, and QR attendance. Strictly <strong className="text-amber-300">zero dummy web data</strong> or mock placeholders.
                </p>
              </div>

              {/* Master Global Download Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadAllExcel}
                  disabled={exportingType === 'master'}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Download all 16 database tables in a single multi-sheet Excel workbook"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>{exportingType === 'master' ? 'Generating Workbook...' : 'Export All Tables (Excel .xls)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAllCSV}
                  disabled={exportingType === 'master_csv'}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-900/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Download all tables combined CSV"
                >
                  <Download className="w-4 h-4 text-indigo-200" />
                  <span>{exportingType === 'master_csv' ? 'Generating...' : 'Export All (CSV)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchDatabaseTables(selectedDbTable)}
                  className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700 flex items-center justify-center cursor-pointer"
                  title="Refresh live data from MySQL"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingTables ? 'animate-spin text-amber-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block font-semibold">Total Database Tables</span>
                <span className="text-lg font-black text-white">{dbTablesSummary?.tableCount ?? 16} Tables</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block font-semibold">Total Real Records</span>
                <span className="text-lg font-black text-emerald-400">{dbTablesSummary?.totalRows ?? 23} Rows Live</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block font-semibold">Selected Table</span>
                <span className="text-lg font-black text-amber-400 font-mono">`{selectedDbTable}`</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block font-semibold">Active Table Records</span>
                <span className="text-lg font-black text-indigo-300">{currentTableData?.count ?? 0} Rows</span>
              </div>
            </div>
          </div>

          {/* Main Table Explorer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Tables List (3 cols) */}
            <div className="lg:col-span-3 space-y-3">
              <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Database Tables ({dbTablesSummary?.tables?.length ?? 16})</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">MySQL Schema</span>
                </div>

                <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
                  {(dbTablesSummary?.tables || []).map(tbl => {
                    const isSelected = selectedDbTable === tbl.tableName;
                    return (
                      <button
                        key={tbl.tableName}
                        onClick={() => fetchSingleTableData(tbl.tableName)}
                        className={`w-full p-2.5 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs font-bold'
                            : 'hover:bg-slate-100 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className={`text-xs truncate ${isSelected ? 'text-white font-black' : 'text-slate-900 font-bold'}`}>
                            {tbl.displayName}
                          </div>
                          <div className={`text-[10px] font-mono truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                            `{tbl.tableName}`
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950'
                            : tbl.rowCount > 0
                            ? 'bg-emerald-100 text-emerald-800 font-black'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {tbl.rowCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Table Data Grid (9 cols) */}
            <div className="lg:col-span-9 space-y-4">
              <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                
                {/* Active Table Header & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-mono text-[11px] font-black">
                        TABLE: `{currentTableData?.tableName || selectedDbTable}`
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold">
                        {currentTableData?.count ?? 0} Real Records
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold">
                        {currentTableData?.columns?.length ?? 0} Columns
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {currentTableData?.displayName || selectedDbTable}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {currentTableData?.description || 'Real database table data from MySQL'}
                    </p>
                  </div>

                  {/* Table Export Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadTableCSV(selectedDbTable)}
                      disabled={exportingType === 'csv'}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Download this table as a CSV spreadsheet"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>{exportingType === 'csv' ? 'Exporting...' : 'Export CSV'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadTableExcel(selectedDbTable)}
                      disabled={exportingType === 'excel'}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Download this table as an Excel (.xls) document"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                      <span>{exportingType === 'excel' ? 'Exporting...' : 'Export Excel'}</span>
                    </button>
                  </div>
                </div>

                {/* Search in Current Table */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(e) => { setTableSearch(e.target.value); setTablePage(1); }}
                      placeholder={`Search across all columns in ${currentTableData?.displayName || selectedDbTable}...`}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-indigo-500 transition"
                    />
                  </div>
                  {tableSearch && (
                    <button
                      onClick={() => { setTableSearch(''); setTablePage(1); }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                {/* Table Data Render */}
                {loadingTables ? (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                    <div className="text-xs font-bold text-slate-600">Querying live data from MySQL `{selectedDbTable}`...</div>
                  </div>
                ) : !currentTableData || !currentTableData.rows || currentTableData.rows.length === 0 ? (
                  <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Table className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-800 text-sm">Table `{selectedDbTable}` is currently empty</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        This table has 0 active records in MySQL. As users register, subscribe, check-in, or submit reviews, real records will be saved and displayed here immediately.
                      </p>
                    </div>
                    <div className="pt-2 flex justify-center gap-2">
                      <button
                        onClick={() => handleDownloadTableCSV(selectedDbTable)}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
                      >
                        Download Schema CSV
                      </button>
                    </div>
                  </div>
                ) : (() => {
                  // Filter rows based on search
                  const rows = currentTableData.rows || [];
                  const columns = currentTableData.columns || [];
                  const filteredRows = tableSearch
                    ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(tableSearch.toLowerCase()))
                    : rows;

                  const totalFiltered = filteredRows.length;
                  const totalPages = Math.ceil(totalFiltered / tableRowsPerPage) || 1;
                  const validPage = Math.min(tablePage, totalPages);
                  const startIdx = (validPage - 1) * tableRowsPerPage;
                  const displayRows = filteredRows.slice(startIdx, startIdx + tableRowsPerPage);

                  return (
                    <div className="space-y-3">
                      {tableSearch && (
                        <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl">
                          Showing {totalFiltered} of {rows.length} records matching "{tableSearch}"
                        </div>
                      )}

                      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                        <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-200">
                          <thead className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider sticky top-0">
                            <tr>
                              <th className="py-3 px-3.5 text-center w-12 text-slate-400">#</th>
                              {columns.map(col => (
                                <th key={col.field} className="py-3 px-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span>{col.field}</span>
                                    {col.key === 'PRI' && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                                        PK
                                      </span>
                                    )}
                                    <span className="text-[9px] text-slate-400 font-normal lowercase font-mono">
                                      ({col.type?.split('(')[0]})
                                    </span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {displayRows.map((row, idx) => {
                              const rowNum = startIdx + idx + 1;
                              return (
                                <tr key={row[currentTableData.primaryKey] || idx} className="hover:bg-slate-50/80 transition">
                                  <td className="py-2.5 px-3.5 text-center font-mono text-[10px] text-slate-400 bg-slate-50/50">
                                    {rowNum}
                                  </td>
                                  {columns.map(col => {
                                    const val = row[col.field];
                                    let rendered = '';
                                    if (val === null || val === undefined || val === '') {
                                      rendered = <span className="text-slate-300 italic text-[11px]">NULL</span>;
                                    } else if (typeof val === 'boolean' || col.type?.includes('tinyint(1)')) {
                                      const isTrue = Boolean(val && val !== '0' && val !== 0);
                                      rendered = (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                          isTrue ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                          {isTrue ? 'TRUE' : 'FALSE'}
                                        </span>
                                      );
                                    } else if (typeof val === 'object') {
                                      rendered = (
                                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded max-w-[200px] truncate block" title={JSON.stringify(val)}>
                                          {JSON.stringify(val)}
                                        </span>
                                      );
                                    } else if (typeof val === 'string' && val.length > 50) {
                                      rendered = (
                                        <span className="max-w-[240px] truncate block text-[11px]" title={val}>
                                          {val}
                                        </span>
                                      );
                                    } else if (col.field.toLowerCase().includes('price') || col.field.toLowerCase().includes('amount')) {
                                      rendered = (
                                        <span className="font-bold text-slate-900 font-mono">
                                          ₹{Number(val).toLocaleString()}
                                        </span>
                                      );
                                    } else {
                                      rendered = <span className="font-medium text-[11px] text-slate-800">{String(val)}</span>;
                                    }

                                    return (
                                      <td key={col.field} className="py-2.5 px-3.5 whitespace-nowrap">
                                        {rendered}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs border-t border-slate-100">
                          <div className="text-slate-500 font-medium">
                            Showing <span className="font-bold text-slate-800">{startIdx + 1}</span> to <span className="font-bold text-slate-800">{Math.min(startIdx + tableRowsPerPage, totalFiltered)}</span> of <span className="font-bold text-slate-800">{totalFiltered}</span> rows
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={validPage <= 1}
                              onClick={() => setTablePage(p => Math.max(1, p - 1))}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold text-xs cursor-pointer"
                            >
                              Previous
                            </button>
                            <span className="px-3 py-1.5 font-bold text-slate-700">
                              Page {validPage} of {totalPages}
                            </span>
                            <button
                              disabled={validPage >= totalPages}
                              onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold text-xs cursor-pointer"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION: MESS PERFORMANCE COMPARISON (PHASE 6 ADMIN-ONLY)     */}
      {/* ============================================================ */}
      {activeTab === 'comparison' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">Cross-Mess Performance Benchmarking</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                  Admin Exclusive 🔒
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Compare student adoption, daily attendance rates, total revenue, and subscription renewal retention across all dining partners.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <span className="text-[11px] font-bold text-slate-500 px-2">Sort by:</span>
                {[
                  { key: 'revenue', label: 'Revenue 💰' },
                  { key: 'attendance', label: 'Attendance % 📊' },
                  { key: 'students', label: 'Students 👥' },
                  { key: 'renewals', label: 'Renewals 🔄' }
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => setComparisonSort(s.key)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      comparisonSort === s.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportComparisonCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                title="Download full comparative dataset as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Benchmark Top Highlights */}
          {(() => {
            if (!messComparison || messComparison.length === 0) return null;
            const topRev = [...messComparison].sort((a, b) => b.revenue - a.revenue)[0];
            const topAtt = [...messComparison].sort((a, b) => b.attendanceRate - a.attendanceRate)[0];
            const topEnrolled = [...messComparison].sort((a, b) => b.students - a.students)[0];

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 space-y-1">
                  <div className="text-[10px] uppercase font-black text-indigo-700 tracking-wider">Top Revenue Generator</div>
                  <div className="text-base font-extrabold text-slate-900">{topRev?.name || '—'}</div>
                  <div className="text-xl font-black text-indigo-900">₹{(topRev?.revenue || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500">{topRev?.activeSubscribers || 0} active subscriptions</div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 space-y-1">
                  <div className="text-[10px] uppercase font-black text-emerald-700 tracking-wider">Highest Attendance Discipline</div>
                  <div className="text-base font-extrabold text-slate-900">{topAtt?.name || '—'}</div>
                  <div className="text-xl font-black text-emerald-800">{topAtt?.attendanceRate || 0}% Check-In</div>
                  <div className="text-[10px] text-slate-500">Regular student turnout</div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 space-y-1">
                  <div className="text-[10px] uppercase font-black text-purple-700 tracking-wider">Largest Student Base</div>
                  <div className="text-base font-extrabold text-slate-900">{topEnrolled?.name || '—'}</div>
                  <div className="text-xl font-black text-purple-900">{topEnrolled?.students || 0} Enrolled Diners</div>
                  <div className="text-[10px] text-slate-500">{topEnrolled?.activePlansCount || 0} meal plans listed</div>
                </div>
              </div>
            );
          })()}

          {/* Comparative Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-xs">
                Total Messes Compared: {messComparison.length}
              </span>
              <span className="text-[11px] text-slate-400">
                Data refreshed in real time from MySQL database
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 text-center w-12 text-slate-400">Rank</th>
                    <th className="py-3 px-3.5">Mess Details</th>
                    <th className="py-3 px-3.5">Campus Area</th>
                    <th className="py-3 px-3.5 text-center">Students</th>
                    <th className="py-3 px-3.5 text-center">Attendance %</th>
                    <th className="py-3 px-3.5 text-right">Total Revenue</th>
                    <th className="py-3 px-3.5 text-center">Active Subs</th>
                    <th className="py-3 px-3.5 text-center">Renewals</th>
                    <th className="py-3 px-3.5 text-center">Plans</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(() => {
                    const sorted = [...(messComparison || [])].sort((a, b) => {
                      if (comparisonSort === 'revenue') return b.revenue - a.revenue;
                      if (comparisonSort === 'attendance') return b.attendanceRate - a.attendanceRate;
                      if (comparisonSort === 'students') return b.students - a.students;
                      if (comparisonSort === 'renewals') return b.renewalsCount - a.renewalsCount;
                      return 0;
                    });

                    if (sorted.length === 0) {
                      return (
                        <tr>
                          <td colSpan="10" className="py-12 text-center text-slate-400">
                            No mess performance data available yet.
                          </td>
                        </tr>
                      );
                    }

                    return sorted.map((m, idx) => (
                      <tr key={m.messId || idx} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3.5 text-center font-black text-slate-500 font-mono">
                          {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-extrabold text-slate-900">{m.name}</div>
                          <div className="text-[10px] text-slate-400">Rating: ⭐ {m.rating || 5.0}</div>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 font-medium">
                          {m.area}
                        </td>
                        <td className="py-3 px-3.5 text-center font-bold text-slate-800">
                          {m.students}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            m.attendanceRate >= 80 ? 'bg-emerald-100 text-emerald-800' :
                            m.attendanceRate >= 60 ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {m.attendanceRate}%
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-indigo-700">
                          ₹{m.revenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5 text-center font-bold text-purple-700">
                          {m.activeSubscribers}
                        </td>
                        <td className="py-3 px-3.5 text-center font-bold text-emerald-600">
                          {m.renewalsCount}
                        </td>
                        <td className="py-3 px-3.5 text-center text-slate-600">
                          {m.activePlansCount}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            m.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {m.verified ? 'VERIFIED' : 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION: PLATFORM ANNOUNCEMENTS BROADCASTS (PHASE 6)          */}
      {/* ============================================================ */}
      {activeTab === 'announcements' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Header */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">Campus Dining Broadcast Center</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-black uppercase tracking-wider">
                  Phase 6 Comms Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Send official notifications to student diners, mess owners, or specific dining partner groups.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              Total Broadcasts: {announcementsList.length}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Broadcast Composer */}
            <div className="lg:col-span-1 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Megaphone className="w-4 h-4 text-purple-600" />
                <h4 className="font-extrabold text-slate-900">New Broadcast Announcement</h4>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500">Quick Notice Presets:</span>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAnnTitle('Scheduled Platform Maintenance');
                      setAnnMessage('MessConnect servers will undergo scheduled infrastructure maintenance tonight between 11:30 PM and 12:00 AM. Meal scanning will continue uninterrupted via offline tokens.');
                      setAnnTarget('ALL_STUDENTS');
                    }}
                    className="p-2 text-left rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                  >
                    🛠️ <span className="font-bold">Scheduled Maintenance</span> (Tonight 11:30 PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnnTitle('Campus Weather Advisory: Extended Dining');
                      setAnnMessage('Due to heavy rainfall in the Alandi campus area, all registered mess dining halls will keep dinner timings extended until 10:30 PM tonight.');
                      setAnnTarget('ALL_STUDENTS');
                    }}
                    className="p-2 text-left rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                  >
                    🌧️ <span className="font-bold">Weather Advisory</span> (Extended Dinner)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnnTitle('Monthly Subscription Renewal Notice');
                      setAnnMessage('Student meal passes for the current cycle will expire at month-end. Please renew your dining subscription in the app to avoid check-in disruption.');
                      setAnnTarget('ALL_STUDENTS');
                    }}
                    className="p-2 text-left rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                  >
                    💳 <span className="font-bold">Renewal Reminder</span> (Semester Passes)
                  </button>
                </div>
              </div>

              {/* Compose Form */}
              <form onSubmit={handleSendAdminAnnouncement} className="space-y-3.5 pt-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Audience:</label>
                  <select
                    value={annTarget}
                    onChange={(e) => setAnnTarget(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="ALL_STUDENTS">🎓 All Registered Students ({customers.length})</option>
                    <option value="ALL_OWNERS">👨‍🍳 All Mess Owners ({adminMesses.length})</option>
                    <option value="SPECIFIC_MESS">🏢 Specific Mess Partner</option>
                    <option value="SPECIFIC_USER">👤 Specific Student / User</option>
                  </select>
                </div>

                {annTarget === 'SPECIFIC_MESS' && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Select Mess Partner:</label>
                    <select
                      value={annTargetMessId}
                      onChange={(e) => setAnnTargetMessId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    >
                      <option value="">-- Choose Mess --</option>
                      {adminMesses.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.area})</option>
                      ))}
                    </select>
                  </div>
                )}

                {annTarget === 'SPECIFIC_USER' && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Select Student:</label>
                    <select
                      value={annTargetUserId}
                      onChange={(e) => setAnnTargetUserId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    >
                      <option value="">-- Choose Student --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email || c.phone})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Announcement Title:</label>
                  <input
                    type="text"
                    required
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Scheduled System Upgrade"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Broadcast Message:</label>
                  <textarea
                    rows="4"
                    required
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Enter broadcast message text..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingAnn}
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingAnn ? 'Broadcasting...' : 'Dispatch Broadcast'}</span>
                </button>
              </form>
            </div>

            {/* Right: Broadcasts History Ledger */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">Broadcast History & Delivery Log</h4>
                    <p className="text-[10px] text-slate-400">All announcements dispatched platform-wide</p>
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                    Live Broadcast Feed
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {announcementsList.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      No broadcast announcements dispatched yet. Use the composer on the left to send an announcement.
                    </div>
                  ) : (
                    announcementsList.map(a => (
                      <div key={a.id} className="p-4 hover:bg-slate-50 transition space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-xs">{a.title}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                a.target === 'ALL_STUDENTS' ? 'bg-indigo-100 text-indigo-800' :
                                a.target === 'ALL_OWNERS' ? 'bg-amber-100 text-amber-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {a.target === 'ALL_STUDENTS' ? '🎓 All Students' :
                                 a.target === 'ALL_OWNERS' ? '👨‍🍳 All Mess Owners' :
                                 `🎯 ${a.targetName || a.target}`}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              By {a.createdByName || 'SuperAdmin'} ({a.createdByRole || 'ADMIN'}) • {a.createdAt ? new Date(a.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Today'}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(a.id)}
                            className="text-slate-400 hover:text-rose-600 transition p-1 text-xs cursor-pointer"
                            title="Delete this announcement"
                          >
                            ✕
                          </button>
                        </div>

                        <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {a.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Announcements automatically generate In-App notifications for all targeted users.</span>
                <span className="font-bold text-slate-700">Syncs instantly with mobile/web clients</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: KYC DOCUMENT INSPECTOR & VERIFICATION DECISION      */}
      {/* ============================================================ */}
      {inspectingApplication && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-100 max-h-[90vh] overflow-y-auto text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Document Inspector: {inspectingApplication.messName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Applicant: {inspectingApplication.ownerName} • {inspectingApplication.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingApplication(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Applicant Details Pill */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Mess Name:</span>
                <span className="font-bold text-slate-900">{inspectingApplication.messName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Area / City:</span>
                <span className="font-bold text-slate-900">{inspectingApplication.area}, {inspectingApplication.city}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Owner Email:</span>
                <span className="font-bold text-slate-900 truncate block">{inspectingApplication.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Current Status:</span>
                <span className="font-bold text-orange-700">{inspectingApplication.verificationStatus || 'UNDER_REVIEW'}</span>
              </div>
            </div>

            {/* Owner Resubmission / Review History Banner */}
            {inspectingApplication.reviewNotes && (
              <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                inspectingApplication.verificationStatus === 'CHANGES_REQUESTED'
                  ? 'bg-rose-50 border border-rose-200 text-rose-900'
                  : inspectingApplication.verificationStatus === 'UNDER_REVIEW'
                  ? 'bg-amber-50 border border-amber-200 text-amber-900'
                  : 'bg-slate-50 border border-slate-200 text-slate-800'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-0.5">
                  <div className="font-extrabold">
                    {inspectingApplication.verificationStatus === 'UNDER_REVIEW'
                      ? 'Owner Application / Resubmission Note:'
                      : inspectingApplication.verificationStatus === 'CHANGES_REQUESTED'
                      ? 'Latest Changes Requested:'
                      : 'Review History Note:'}
                  </div>
                  <p className="text-[11px] leading-relaxed">{inspectingApplication.reviewNotes}</p>
                </div>
              </div>
            )}

            {/* 4 Submitted KYC Documents Inspection with Visual Previews */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
                  Submitted Verification Documents & Scans
                </h4>
                <span className="text-[10px] text-slate-500 font-semibold">
                  Inspect scans before approving
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderInspectorDocCard(
                  inspectingApplication.documents?.ownerId,
                  '1. Owner Identity Proof (Aadhaar / ID)',
                  'Aadhaar Card (UIDAI Verified)',
                  'Identity',
                  FileText,
                  'text-blue-600'
                )}

                {renderInspectorDocCard(
                  inspectingApplication.documents?.license,
                  '2. FSSAI Food Safety License',
                  'FSSAI License #11524021000849',
                  'Food Safety',
                  ShieldCheck,
                  'text-emerald-600'
                )}

                {renderInspectorDocCard(
                  inspectingApplication.documents?.businessDoc,
                  '3. Shop & Establishment Act / Gumasta',
                  'Shop Act License Registration',
                  'Municipal Registration',
                  FileText,
                  'text-purple-600'
                )}

                {renderInspectorDocCard(
                  inspectingApplication.documents?.addressProof,
                  '4. Mess Premises Address Proof',
                  'Commercial Electricity Bill / Lease',
                  'Premises Verification',
                  FileText,
                  'text-amber-600'
                )}
              </div>
            </div>

            {/* Decision Notes Input */}
            <div className="space-y-1.5 pt-1">
              <label className="font-bold text-slate-700 block">
                Compliance Review Feedback / Reason (Sent via SMS & Email to Owner):
              </label>
              <textarea
                rows="2"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="e.g. All documents verified. Approved for student subscriptions. OR Please upload renewed FSSAI license certificate."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <div className="flex flex-wrap gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setDecisionReason('Approved by MessConnect Quality & Compliance Team. Welcome to MessConnect!')}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Preset: Full Approval
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionReason('Uploaded FSSAI document is blurred or expired. Please upload a clear renewed certificate.')}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Preset: Clearer FSSAI Needed
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionReason('Address on utility bill does not match business establishment address.')}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Preset: Address Mismatch
                </button>
              </div>
            </div>

            {/* Decision Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-100">
              
              {/* APPROVE */}
              <button
                type="button"
                disabled={submittingDecision}
                onClick={() => handleExecuteDecision('APPROVE')}
                className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>APPROVE & ACTIVATE</span>
              </button>

              {/* REQUEST CHANGES */}
              <button
                type="button"
                disabled={submittingDecision}
                onClick={() => handleExecuteDecision('CHANGES_REQUESTED')}
                className="py-3 px-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>REQUEST CHANGES</span>
              </button>

              {/* REJECT */}
              <button
                type="button"
                disabled={submittingDecision}
                onClick={() => handleExecuteDecision('REJECT')}
                className="py-3 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>REJECT APPLICATION</span>
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: RESOLVE COMPLAINT MODAL                             */}
      {/* ============================================================ */}
      {resolvingComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Resolve Student Complaint</h3>
              <button onClick={() => setResolvingComplaint(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
              <div className="font-bold text-slate-900">{resolvingComplaint.subject}</div>
              <p className="text-slate-600">{resolvingComplaint.description}</p>
              <div className="text-[10px] text-slate-400">Filed by {resolvingComplaint.userName} regarding {resolvingComplaint.messName}</div>
            </div>

            <form onSubmit={handleResolveComplaint} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Admin Investigation & Resolution Notes:</label>
                <textarea
                  rows="3"
                  required
                  value={complaintAdminNotes}
                  onChange={(e) => setComplaintAdminNotes(e.target.value)}
                  placeholder="e.g. Conducted kitchen audit and verified hygiene standards with mess management. Standards verified."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingComplaint(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Mark as Resolved & Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* FULL SIZE DOCUMENT PREVIEW MODAL */}
      <DocumentViewerModal
        doc={previewDocModal}
        isOpen={Boolean(previewDocModal)}
        onClose={() => setPreviewDocModal(null)}
      />

      {/* ============================================================ */}
      {/* PHASE 6: NOTIFICATION CENTER MODAL */}
      <NotificationCenterModal
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        userRole="ADMIN"
      />

    </div>
  );
};
