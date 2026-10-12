import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { DemandForecastCard } from '../components/owner/DemandForecastCard';
import { SubscribersManager } from '../components/owner/SubscribersManager';
import { TrialRequestsManager } from '../components/owner/TrialRequestsManager';
import { MealPassScanner } from '../components/owner/MealPassScanner';
import { OwnerAttendanceManager } from '../components/owner/OwnerAttendanceManager';
import { OwnerSettingsView } from '../components/owner/OwnerSettingsView';
import { DocumentViewerModal } from '../components/common/DocumentViewerModal';
import { PlanManager } from '../components/owner/PlanManager';
import { RevenueManager } from '../components/owner/RevenueManager';
import { OwnerAnalyticsAndReports } from '../components/owner/OwnerAnalyticsAndReports';
import { OwnerAnnouncementsManager } from '../components/owner/OwnerAnnouncementsManager';
import {
  ChefHat, Users, Utensils, IndianRupee, Tag, Clock, Calendar,
  Check, Send, Sparkles, ScanLine, LogOut, Mail, Phone, Settings,
  ShieldCheck, AlertTriangle, XCircle, RefreshCw, FileText, CheckCircle2,
  AlertCircle, Upload, Eye, Lock, X, Megaphone, BarChart3
} from 'lucide-react';

export const OwnerView = () => {
  const { currentUser, logout, refreshUser } = useAuth();
  const { showToast, notifications, unreadCount, loadNotifications } = useNotification();
  const [stats, setStats] = useState(null);

  // Verification lifecycle: Document verification requirement removed - all active mess partners are approved
  const isApproved = currentUser?.verificationStatus !== 'REJECTED';
  const verificationStatus = isApproved ? 'APPROVED' : 'REJECTED';

  // Active tab state: Default directly to Attendance System
  const [activeTab, setActiveTab] = useState('attendance');

  // Menu editor state
  const [breakfastMenu, setBreakfastMenu] = useState('');
  const [lunchMenu, setLunchMenu] = useState('');
  const [dinnerMenu, setDinnerMenu] = useState('');
  const [messCoverImage, setMessCoverImage] = useState('');
  const [messImageUploading, setMessImageUploading] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);

  // Broadcast offer state
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  // Document Resubmission Modal State
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitDocs, setResubmitDocs] = useState({
    ownerId: {
      docNumber: '',
      fileName: '',
      fileSize: '',
      fileType: '',
      fileUrl: '',
      title: 'Owner Identity (Aadhaar Card)'
    },
    license: {
      docNumber: '',
      fileName: '',
      fileSize: '',
      fileType: '',
      fileUrl: '',
      title: 'FSSAI Food Safety License'
    },
    businessDoc: {
      docNumber: '',
      fileName: '',
      fileSize: '',
      fileType: '',
      fileUrl: '',
      title: 'Shop & Establishment Act'
    },
    addressProof: {
      docNumber: '',
      fileName: '',
      fileSize: '',
      fileType: '',
      fileUrl: '',
      title: 'Mess Premises Address Proof'
    }
  });
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [submittingDocs, setSubmittingDocs] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Full Screen Document Preview Modal
  const [previewDocModal, setPreviewDocModal] = useState(null);

  // Load mess data to populate today's menu and photo
  useEffect(() => {
    const loadMessData = async () => {
      if (!currentUser?.messId) return;
      try {
        const res = await api.getMessDetails(currentUser.messId);
        if (res && res.mess) {
          if (res.mess.menuToday) {
            const { breakfast, lunch, dinner } = res.mess.menuToday;
            setBreakfastMenu(Array.isArray(breakfast) ? breakfast.join(', ') : (breakfast || ''));
            setLunchMenu(Array.isArray(lunch) ? lunch.join(', ') : (lunch || ''));
            setDinnerMenu(Array.isArray(dinner) ? dinner.join(', ') : (dinner || ''));
          }
          if (res.mess.coverImage) {
            setMessCoverImage(res.mess.coverImage);
          }
        }
      } catch (err) {
        console.warn('[OwnerView] Could not load mess details for menu:', err);
      }
    };
    loadMessData();
  }, [currentUser?.messId]);

  // Populate resubmitDocs with current user's documents when opening modal
  useEffect(() => {
    if (currentUser?.documents) {
      const d = currentUser.documents;
      setResubmitDocs(prev => ({
        ownerId: typeof d.ownerId === 'object' ? d.ownerId : { ...prev.ownerId, docNumber: String(d.ownerId || '') },
        license: typeof d.license === 'object' ? d.license : { ...prev.license, docNumber: String(d.license || '') },
        businessDoc: typeof d.businessDoc === 'object' ? d.businessDoc : { ...prev.businessDoc, docNumber: String(d.businessDoc || '') },
        addressProof: typeof d.addressProof === 'object' ? d.addressProof : { ...prev.addressProof, docNumber: String(d.addressProof || '') }
      }));
    }
  }, [currentUser]);

  const fetchStats = async () => {
    if (!currentUser?.messId) return;
    try {
      const res = await api.getOwnerStats(currentUser.messId);
      if (res && res.metrics) {
        setStats(res.metrics);
      }
    } catch (e) {
      console.warn('[OwnerView] Error fetching stats:', e);
    }
  };

  // Automatically refresh latest status from server on mount
  useEffect(() => {
    if (refreshUser) {
      refreshUser();
    }
  }, []);

  // When approved, automatically transition from status/KYC screen to operational tools
  useEffect(() => {
    if (isApproved && activeTab === 'status') {
      setActiveTab('attendance');
    }
  }, [isApproved]);

  useEffect(() => {
    fetchStats();
  }, [currentUser?.messId]);

  // Handle checking status from DB
  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      if (refreshUser) {
        const u = await refreshUser();
        if (u) {
          const st = u.verificationStatus || (u.verified ? 'APPROVED' : 'UNDER_REVIEW');
          showToast(`Current status: ${st}`, st === 'APPROVED' ? 'success' : 'info', '🔄 Status Refreshed');
          if (st === 'APPROVED' && activeTab === 'status') {
            setActiveTab('attendance');
          }
        }
      }
    } catch (e) {
      showToast('Could not refresh status', 'error');
    } finally {
      setCheckingStatus(false);
    }
  };

  // Handle File Upload in Resubmit Modal
  const handleResubmitFileUpload = (docKey, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      const formattedSize = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      setResubmitDocs(prev => ({
        ...prev,
        [docKey]: {
          ...(prev[docKey] || {}),
          fileName: file.name,
          fileSize: formattedSize,
          fileType: file.type || 'image/jpeg',
          fileUrl: dataUrl,
          uploadedAt: new Date().toISOString()
        }
      }));
      showToast(`Attached ${file.name} successfully!`, 'success', '📄 Document Attached');
    };
    reader.readAsDataURL(file);
  };

  // Handle Resubmit Documents Submission to Admin
  const handleResubmitSubmit = async (e) => {
    e.preventDefault();
    setSubmittingDocs(true);
    try {
      const res = await api.resubmitDocuments({
        userId: currentUser?.id,
        documents: resubmitDocs,
        notes: resubmitNotes || 'Updated documents resubmitted by owner for re-inspection.'
      });

      if (res && res.success) {
        showToast('Updated documents submitted! Admin has received your re-inspection request.', 'success', '📄 Sent to Admin');
        setShowResubmitModal(false);
        if (refreshUser) {
          await refreshUser();
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit documents', 'error');
    } finally {
      setSubmittingDocs(false);
    }
  };

  // Handle Kitchen / Mess Cover Image Upload from Disk
  const handleMessCoverImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be less than 5MB', 'error');
      return;
    }

    setMessImageUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setMessCoverImage(event.target.result);
      setMessImageUploading(false);
      showToast(`Selected "${file.name}". Click "Publish & Email Students" to save!`, 'info', '📷 Image Ready');
    };
    reader.onerror = () => {
      setMessImageUploading(false);
      showToast('Failed to read image file', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    if (!currentUser?.messId) {
      showToast('Mess profile not found', 'error');
      return;
    }
    setSavingMenu(true);
    try {
      const res = await api.updateMenu(currentUser.messId, {
        menuToday: {
          breakfast: breakfastMenu ? breakfastMenu.split(',').map(s => s.trim()).filter(Boolean) : [],
          lunch: lunchMenu ? lunchMenu.split(',').map(s => s.trim()).filter(Boolean) : [],
          dinner: dinnerMenu ? dinnerMenu.split(',').map(s => s.trim()).filter(Boolean) : []
        },
        coverImage: messCoverImage || undefined
      });

      if (res && res.success) {
        showToast(
          res.message || "Today's menu & photo updated! Subscribed students notified via registered email.",
          'success',
          '📢 Menu Published & Emailed'
        );
      }
    } catch (e) {
      showToast('Failed to update menu', 'error');
    } finally {
      setSavingMenu(false);
    }
  };

  const handleBroadcastOffer = async (e) => {
    e.preventDefault();
    if (!currentUser?.messId) {
      showToast('Mess profile not found', 'error');
      return;
    }
    setBroadcasting(true);
    try {
      await api.broadcastOffer({
        messId: currentUser.messId,
        title: offerTitle,
        description: offerDesc,
        discountPercent: 10
      });
      showToast('Offer broadcasted! Students notified.', 'success', '🎁 Offer Sent');
      setOfferTitle('');
      setOfferDesc('');
    } catch (e) {
      showToast('Failed to send offer', 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  // Helper to render document card in Tab 0
  const renderDocCard = (doc, fallbackTitle, fallbackNumber, docKey) => {
    const isObj = typeof doc === 'object' && doc !== null;
    const title = isObj ? (doc.title || fallbackTitle) : fallbackTitle;
    const number = isObj ? (doc.docNumber || doc.fileName || fallbackNumber) : String(doc || fallbackNumber);
    const fileName = isObj ? doc.fileName : '';
    const fileSize = isObj ? doc.fileSize : '';
    const fileUrl = isObj ? doc.fileUrl : '';

    return (
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>{title}</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            {fileName ? 'Scan Uploaded ✓' : 'Submitted'}
          </span>
        </div>

        <div className="font-mono text-xs text-slate-900 font-bold bg-white p-2 rounded-xl border border-slate-200 truncate">
          {number}
        </div>

        {fileName && (
          <div className="flex items-center justify-between text-[11px] bg-slate-100/80 p-2 rounded-xl border border-slate-200">
            <span className="text-slate-600 truncate">📎 {fileName} {fileSize ? `(${fileSize})` : ''}</span>
            {fileUrl && (
              <button
                type="button"
                onClick={() => setPreviewDocModal({
                  title,
                  fileUrl,
                  fileName,
                  docNumber: number,
                  fileType: isObj ? doc.fileType : undefined,
                  fileSize
                })}
                className="text-orange-600 hover:text-orange-700 font-bold ml-2 shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> View Scan
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      
      {/* Header */}
      <header className="px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200/80 shrink-0 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">Welcome, {currentUser?.name} 👋</h2>
              
              {/* Lifecycle Status Pill */}
              {verificationStatus === 'APPROVED' && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold tracking-wide uppercase border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified Partner</span>
                </span>
              )}
              {verificationStatus === 'UNDER_REVIEW' && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold tracking-wide uppercase border border-amber-200">
                  <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                  <span>Under Review</span>
                </span>
              )}
              {(verificationStatus === 'CHANGES_REQUESTED' || verificationStatus === 'REJECTED') && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold tracking-wide uppercase border border-rose-200">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span>Action Required</span>
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
              <span className="text-orange-600 font-bold">{currentUser?.messName || 'Partner Mess'}</span>
              {currentUser?.email && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{currentUser.email}</span>
                </span>
              )}
              {currentUser?.phone && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{currentUser.phone}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isApproved && (
              <button
                onClick={handleCheckStatus}
                disabled={checkingStatus}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                title="Refresh latest verification status from server"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Status</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                activeTab === 'settings'
                  ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>⚙️ Settings</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-slate-700 font-bold text-xs transition"
              title="Sign Out of Partner Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full p-4 sm:p-6 pb-24 space-y-5">

        {/* 1. LIFECYCLE ONBOARDING & VERIFICATION STATUS BANNERS */}

        {/* STATE A: UNDER REVIEW */}
        {verificationStatus === 'UNDER_REVIEW' && (
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-5 h-5 text-amber-600 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-amber-950 text-sm sm:text-base">
                      Application Under Review (Verification in Progress)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                      1-2 Business Days
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/90 mt-1 leading-relaxed max-w-3xl">
                    Your owner registration details and compliance documents (Owner ID, FSSAI Food Safety License, Shop Act, and Address Proof) are currently undergoing verification by our operations team.
                  </p>
                  {currentUser?.reviewNotes && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-100/70 border border-amber-300/70 text-xs text-amber-950 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="font-bold shrink-0">Note:</span>
                      <span className="truncate">{currentUser.reviewNotes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => setShowResubmitModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs shadow-xs transition flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Update Scans</span>
                </button>
                <button
                  onClick={handleCheckStatus}
                  disabled={checkingStatus}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                  <span>Check Status</span>
                </button>
              </div>
            </div>

            {/* Application Lifecycle Step Tracker */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-amber-200/70 text-xs">
              <div className="p-3 rounded-2xl bg-white/80 border border-amber-200/60 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <div className="font-bold text-slate-800">1. Details & KYC Submitted</div>
                  <div className="text-[11px] text-slate-500">Scans uploaded and on file</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-100/80 border border-amber-300 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold animate-pulse">
                  2
                </div>
                <div>
                  <div className="font-bold text-amber-950">2. Compliance Verification</div>
                  <div className="text-[11px] text-amber-800">Admin reviewing FSSAI & ID</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/60 border border-slate-200 flex items-center gap-2.5 opacity-70">
                <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center font-bold">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-700">3. Live Listing & Subscriptions</div>
                  <div className="text-[11px] text-slate-400">Unlocks upon approval</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE B: CHANGES REQUESTED / REJECTED */}
        {(verificationStatus === 'CHANGES_REQUESTED' || verificationStatus === 'REJECTED') && (
          <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-300 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-rose-950 text-sm sm:text-base">
                      {verificationStatus === 'REJECTED' ? 'Application Not Approved' : 'Action Required: Document Updates Requested by Admin'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-bold">
                      Admin Notice
                    </span>
                  </div>
                  
                  {/* Admin's Specific Review Note */}
                  <div className="mt-2 p-3 bg-white rounded-2xl border border-rose-200 text-xs space-y-1">
                    <div className="font-bold text-rose-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>Admin Compliance Note:</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium">
                      "{currentUser?.reviewNotes || 'Please upload a clearer scan of your FSSAI license certificate and updated shop establishment documents.'}"
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowResubmitModal(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/30 transition flex items-center gap-1.5 self-start sm:self-center shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Update & Resubmit Documents</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE C: APPROVED NOTICE */}
        {isApproved && (
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Verified Mess Partner:</strong> Your account is fully compliant with FSSAI regulations. All owner operational tools are unlocked.
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
              Active & Public
            </span>
          </div>
        )}

        {/* Top 3 KPI Cards */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-xs">
            <div className="text-[10px] text-slate-400 font-medium">Active Students</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {isApproved ? (stats?.activeSubscribers ?? 0) : 0}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-xs">
            <div className="text-[10px] text-slate-400 font-medium">Today's Meals</div>
            <div className="text-xl font-extrabold text-orange-600 mt-0.5">
              {isApproved ? (stats?.todayTotalMealsServed ?? 0) : 0}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-xs">
            <div className="text-[10px] text-slate-400 font-medium">Est. Monthly Revenue</div>
            <div className="text-base font-extrabold text-emerald-700 mt-0.5">
              {isApproved ? `₹${(stats?.monthlyRevenue || 0).toLocaleString('en-IN')}` : '₹0.00'}
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'analytics', label: 'Analytics & Reports 📊', locked: false },
            { key: 'announcements', label: 'Announcements 📢', locked: false },
            { key: 'attendance', label: 'Attendance System 📋', locked: false },
            { key: 'status', label: 'Verification & Status 📄', showAlways: true, locked: false },
            { key: 'plans', label: 'Meal Plans 🍱', locked: false },
            { key: 'revenue', label: 'Revenue & Payments 💰', locked: false },
            { key: 'scanner', label: 'Entrance Scanner 📲', locked: false },
            { key: 'forecast', label: 'Demand Forecast 📈', locked: false },
            { key: 'subscribers', label: 'Students', locked: false },
            { key: 'trials', label: 'Trial Requests', locked: false },
            { key: 'menu', label: 'Menu Editor 🍽️', showAlways: true, locked: false },
            { key: 'offers', label: 'Send Offers 🎁', locked: false },
            { key: 'settings', label: '⚙️ Settings', showAlways: true, locked: false }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === t.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ======================================================= */}
        {/* TAB CONTENTS                                           */}
        {/* ======================================================= */}

        {/* TAB 0: VERIFICATION & COMPLIANCE (Section 13) */}
        {activeTab === 'status' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Real Uploaded KYC Credentials Preview Grid */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Uploaded Government Registration Credentials</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Inspected by Admin compliance quality team. Click "Inspect Scan" to view uploaded files.
                  </p>
                </div>

                <button
                  onClick={() => setShowResubmitModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200 transition flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Update Scans</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {renderDocCard(currentUser?.documents?.ownerId, 'Owner Identity (Aadhaar / Voter ID)', 'UIDAI Verified', 'ownerId')}
                {renderDocCard(currentUser?.documents?.license, 'FSSAI Food Safety License', 'FSSAI License Verified', 'license')}
                {renderDocCard(currentUser?.documents?.businessDoc, 'Shop & Establishment Act / Gumasta', 'Registration Verified', 'businessDoc')}
                {renderDocCard(currentUser?.documents?.addressProof, 'Premises Address Proof (Electricity Bill)', 'Utility Verified', 'addressProof')}
              </div>
            </div>

            {/* Quick Helper Banner */}
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-950 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Admin inspects all FSSAI food certificates within 2-4 hours to guarantee pure, hygienic dining for campus students.
                </span>
              </div>
              <button
                onClick={handleCheckStatus}
                disabled={checkingStatus}
                className="px-3 py-1 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-[11px] shrink-0 transition"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* TAB: ADVANCED ANALYTICS & REPORTS (Phase 6) */}
        {activeTab === 'analytics' && (
          <div className="animate-in fade-in duration-150">
            {isApproved ? (
              <OwnerAnalyticsAndReports
                messId={currentUser?.messId}
                messName={currentUser?.messName}
              />
            ) : (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">Analytics & Reports Locked</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Awaiting compliance approval from Admin operations team.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB: ANNOUNCEMENTS & BROADCASTS (Phase 6) */}
        {activeTab === 'announcements' && (
          <div className="animate-in fade-in duration-150">
            {isApproved ? (
              <OwnerAnnouncementsManager
                messId={currentUser?.messId}
                messName={currentUser?.messName}
              />
            ) : (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">Student Broadcasts Locked</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Awaiting compliance approval from Admin operations team.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB: ATTENDANCE SYSTEM */}
        {activeTab === 'attendance' && (
          <div className="animate-in fade-in duration-150">
            {isApproved ? (
              <OwnerAttendanceManager />
            ) : (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">Attendance System is Locked</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Your mess attendance QR code generator and attendance analytics will automatically unlock once the Admin compliance team approves your FSSAI credentials.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-xs hover:bg-orange-700 transition"
                  >
                    Edit Today's Menu Instead
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: MEAL PLANS (PHASE 4) */}
        {activeTab === 'plans' && (
          <div className="animate-in fade-in duration-150">
            {isApproved ? (
              <PlanManager messId={currentUser?.messId} />
            ) : (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
                <Utensils className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">Meal Plans Locked</h4>
                <p className="text-xs text-slate-500">Plan management will unlock once your mess KYC is approved.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: REVENUE & PAYMENTS (PHASE 4) */}
        {activeTab === 'revenue' && (
          <div className="animate-in fade-in duration-150">
            {isApproved ? (
              <RevenueManager messId={currentUser?.messId} />
            ) : (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
                <IndianRupee className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">Revenue Dashboard Locked</h4>
                <p className="text-xs text-slate-500">Financial records will appear once student subscriptions begin.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: ENTRANCE SCANNER */}
        {activeTab === 'scanner' && (
          <div className="animate-in fade-in duration-150">
            {isApproved ? (
              <MealPassScanner messId={currentUser?.messId} />
            ) : (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">QR Meal Pass Scanner is Locked</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Your student pass scanner and meal check-in terminal will automatically unlock once the Admin compliance team approves your FSSAI credentials.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-xs hover:bg-orange-700 transition"
                  >
                    Edit Today's Menu Instead
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DEMAND FORECAST */}
        {activeTab === 'forecast' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {isApproved ? (
              <>
                <DemandForecastCard messId={currentUser?.messId} />
                <SubscribersManager messId={currentUser?.messId} />
              </>
            ) : (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">Demand Forecast Locked</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Forecast and consumption AI analytics will activate after public subscriptions begin.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUBSCRIBERS */}
        {activeTab === 'subscribers' && (
          <div className="animate-in fade-in duration-150">
            {isApproved ? (
              <SubscribersManager messId={currentUser?.messId} />
            ) : (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">No Active Students Yet</h4>
                <p className="text-xs text-slate-500">Student subscriptions will open upon verification approval.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TRIALS */}
        {activeTab === 'trials' && (
          <div className="animate-in fade-in duration-150">
            {isApproved ? (
              <TrialRequestsManager messId={currentUser?.messId} />
            ) : (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
                <Utensils className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">Trial Meal Bookings Locked</h4>
                <p className="text-xs text-slate-500">Students can book trial meals as soon as your mess is verified.</p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs hover:bg-slate-800 transition"
                  >
                    Update Menu
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MENU & PHOTO MANAGER */}
        {activeTab === 'menu' && (
          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-5 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-orange-600" />
                  <span>Live Menu & Kitchen Photo Manager</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update daily dishes and your mess photo. All active student subscribers will be notified immediately via registered email.
                </p>
              </div>

              <span className="self-start sm:self-center px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold flex items-center gap-1.5 shrink-0">
                <Mail className="w-3.5 h-3.5 text-orange-600" />
                <span>Auto-Email Active Students</span>
              </span>
            </div>

            {/* Notification Guarantee Alert Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Automatic Student Email Alert:</span>
                <span className="text-slate-600 block leading-relaxed">
                  When you click <strong>"Publish Menu & Email Subscribed Students"</strong> below, all students holding an active meal pass for your mess will receive a transactional email directly to their registered email address displaying today's updated menu!
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-5 text-xs">
              
              {/* SECTION 1: MESS KITCHEN PHOTO / COVER IMAGE */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <ChefHat className="w-4 h-4 text-orange-600" />
                    <span>Mess Photo / Kitchen Cover Image</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Shown to students on discovery card</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Photo Preview */}
                  <div className="relative w-full sm:w-36 h-28 rounded-2xl bg-slate-900 overflow-hidden border border-slate-300 shrink-0 shadow-inner flex items-center justify-center group">
                    <img
                      src={messCoverImage || '/logo.jpeg'}
                      alt="Mess Cover Preview"
                      className="w-full h-full object-contain p-1.5"
                    />
                    <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] text-white font-bold">
                      Current
                    </div>
                  </div>

                  {/* Upload Actions */}
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3.5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{messImageUploading ? 'Processing...' : 'Upload New Mess Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMessCoverImageUpload}
                          disabled={messImageUploading}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setMessCoverImage('/logo.jpeg');
                          showToast('Reset photo to official MessConnect logo', 'info');
                        }}
                        className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                      >
                        Reset to Logo
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Or paste public image URL:</span>
                      <input
                        type="text"
                        value={messCoverImage}
                        onChange={(e) => setMessCoverImage(e.target.value)}
                        placeholder="https://... or data:image/..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DAILY MEAL DISHES */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-orange-900 block mb-1 flex items-center gap-1.5">
                    <span>🌅 Today's Breakfast (Comma-separated dishes)</span>
                  </label>
                  <textarea
                    rows="2"
                    value={breakfastMenu}
                    onChange={(e) => setBreakfastMenu(e.target.value)}
                    placeholder="e.g. Hot Poha with Sev & Lemon, Upma, Ginger Chai"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 transition focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-amber-900 block mb-1 flex items-center gap-1.5">
                    <span>☀️ Today's Lunch (Comma-separated dishes)</span>
                  </label>
                  <textarea
                    rows="2"
                    value={lunchMenu}
                    onChange={(e) => setLunchMenu(e.target.value)}
                    placeholder="e.g. 4 Hot Phulkas, Panchratna Dal, Paneer Bhurji, Steamed Rice, Salad"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 transition focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-indigo-900 block mb-1 flex items-center gap-1.5">
                    <span>🌙 Today's Dinner (Comma-separated dishes)</span>
                  </label>
                  <textarea
                    rows="2"
                    value={dinnerMenu}
                    onChange={(e) => setDinnerMenu(e.target.value)}
                    placeholder="e.g. Warm Rotis, Dal Tadka, Aloo Gobi Masala, Jeera Rice, Gulab Jamun"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 transition focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingMenu}
                className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-2xl transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
              >
                <Send className="w-4 h-4" />
                <span>{savingMenu ? 'Updating & Sending Emails...' : "Publish Menu & Email Subscribed Students 🚀"}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: BROADCAST OFFERS */}
        {activeTab === 'offers' && (
          <div className="animate-in fade-in duration-150">
            {isApproved ? (
              <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Broadcast Student Promo</h3>
                  <p className="text-xs text-slate-500">Send an instant offer banner and alert to all active student subscribers.</p>
                </div>

                <form onSubmit={handleBroadcastOffer} className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Offer Title</label>
                    <input
                      type="text"
                      required
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      placeholder="e.g. End-Semester Renewal Bonus"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Details & Promo Code</label>
                    <textarea
                      rows="2"
                      required
                      value={offerDesc}
                      onChange={(e) => setOfferDesc(e.target.value)}
                      placeholder="e.g. Flat ₹200 OFF on 30-day renewal with code RENEW200"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={broadcasting}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{broadcasting ? 'Sending Broadcast...' : 'Broadcast Offer to Students'}</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
                <Tag className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">Promotional Broadcasts Locked</h4>
                <p className="text-xs text-slate-500">Broadcasting offers is available after your partner verification is approved.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-150">
            <OwnerSettingsView />
          </div>
        )}

      </main>

      {/* ======================================================= */}
      {/* RESUBMIT KYC DOCUMENTS MODAL WITH FILE UPLOADS          */}
      {/* ======================================================= */}
      {showResubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Update & Resubmit Documents to Admin</h3>
                  <p className="text-[11px] text-slate-500">Attach clearer file scans and provide updated license numbers</p>
                </div>
              </div>
              <button
                onClick={() => setShowResubmitModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Admin's note */}
            {currentUser?.reviewNotes && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                <span className="font-bold text-rose-900 block flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Admin Compliance Feedback:</span>
                </span>
                <span className="text-slate-700 font-medium leading-relaxed block">{currentUser.reviewNotes}</span>
              </div>
            )}

            <form onSubmit={handleResubmitSubmit} className="space-y-4 text-xs">
              
              {/* 1. Owner ID */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block">
                  1. Owner Identity Proof (Aadhaar / Passport)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={resubmitDocs.ownerId?.docNumber || ''}
                    onChange={(e) => setResubmitDocs(prev => ({
                      ...prev,
                      ownerId: { ...prev.ownerId, docNumber: e.target.value }
                    }))}
                    placeholder="Aadhaar UID (e.g. 7812-3490-2134)"
                    className="p-2 bg-white border border-slate-200 rounded-xl"
                  />
                  <label className="flex items-center justify-center gap-1 p-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-semibold cursor-pointer text-slate-700 truncate">
                    <Upload className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span className="truncate">{resubmitDocs.ownerId?.fileName || 'Upload Aadhaar Scan'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleResubmitFileUpload('ownerId', e)}
                      className="hidden"
                    />
                  </label>
                </div>
                {resubmitDocs.ownerId?.fileName && (
                  <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-600 truncate">📎 {resubmitDocs.ownerId.fileName} ({resubmitDocs.ownerId.fileSize || 'Attached'})</span>
                    {resubmitDocs.ownerId.fileUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewDocModal({
                          title: 'Owner Identity Proof (Aadhaar / Passport)',
                          ...resubmitDocs.ownerId
                        })}
                        className="text-orange-600 hover:text-orange-700 font-bold ml-2 shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview Scan
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 2. FSSAI License */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block">
                  2. FSSAI Food Safety License Certificate
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={resubmitDocs.license?.docNumber || ''}
                    onChange={(e) => setResubmitDocs(prev => ({
                      ...prev,
                      license: { ...prev.license, docNumber: e.target.value }
                    }))}
                    placeholder="14-digit FSSAI # (e.g. 11524021000849)"
                    className="p-2 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                  <label className="flex items-center justify-center gap-1 p-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-semibold cursor-pointer text-slate-700 truncate">
                    <Upload className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{resubmitDocs.license?.fileName || 'Upload Renewed FSSAI'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleResubmitFileUpload('license', e)}
                      className="hidden"
                    />
                  </label>
                </div>
                {resubmitDocs.license?.fileName && (
                  <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-600 truncate">📎 {resubmitDocs.license.fileName} ({resubmitDocs.license.fileSize || 'Attached'})</span>
                    {resubmitDocs.license.fileUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewDocModal({
                          title: 'FSSAI Food Safety License Certificate',
                          ...resubmitDocs.license
                        })}
                        className="text-emerald-600 hover:text-emerald-700 font-bold ml-2 shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview Scan
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Shop Act */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block">
                  3. Shop & Establishment Act / Municipal License
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={resubmitDocs.businessDoc?.docNumber || ''}
                    onChange={(e) => setResubmitDocs(prev => ({
                      ...prev,
                      businessDoc: { ...prev.businessDoc, docNumber: e.target.value }
                    }))}
                    placeholder="Shop Act Reg # (e.g. MH-PUN-2024-819)"
                    className="p-2 bg-white border border-slate-200 rounded-xl"
                  />
                  <label className="flex items-center justify-center gap-1 p-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-semibold cursor-pointer text-slate-700 truncate">
                    <Upload className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="truncate">{resubmitDocs.businessDoc?.fileName || 'Upload Shop Act'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleResubmitFileUpload('businessDoc', e)}
                      className="hidden"
                    />
                  </label>
                </div>
                {resubmitDocs.businessDoc?.fileName && (
                  <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-600 truncate">📎 {resubmitDocs.businessDoc.fileName} ({resubmitDocs.businessDoc.fileSize || 'Attached'})</span>
                    {resubmitDocs.businessDoc.fileUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewDocModal({
                          title: 'Shop & Establishment Act / Municipal Registration',
                          ...resubmitDocs.businessDoc
                        })}
                        className="text-purple-600 hover:text-purple-700 font-bold ml-2 shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview Scan
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Address Proof */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block">
                  4. Mess Premises Address Proof
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={resubmitDocs.addressProof?.docNumber || ''}
                    onChange={(e) => setResubmitDocs(prev => ({
                      ...prev,
                      addressProof: { ...prev.addressProof, docNumber: e.target.value }
                    }))}
                    placeholder="Electricity Bill / Lease Agreement #"
                    className="p-2 bg-white border border-slate-200 rounded-xl"
                  />
                  <label className="flex items-center justify-center gap-1 p-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-semibold cursor-pointer text-slate-700 truncate">
                    <Upload className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{resubmitDocs.addressProof?.fileName || 'Upload Address Proof'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleResubmitFileUpload('addressProof', e)}
                      className="hidden"
                    />
                  </label>
                </div>
                {resubmitDocs.addressProof?.fileName && (
                  <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-600 truncate">📎 {resubmitDocs.addressProof.fileName} ({resubmitDocs.addressProof.fileSize || 'Attached'})</span>
                    {resubmitDocs.addressProof.fileUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewDocModal({
                          title: 'Mess Premises Address Proof',
                          ...resubmitDocs.addressProof
                        })}
                        className="text-amber-600 hover:text-amber-700 font-bold ml-2 shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview Scan
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Note to Compliance Team */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Message to SuperAdmin Compliance Team
                </label>
                <textarea
                  rows="2"
                  value={resubmitNotes}
                  onChange={(e) => setResubmitNotes(e.target.value)}
                  placeholder="e.g. Attached renewed 2026 FSSAI certificate scan. Please re-verify."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResubmitModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingDocs}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>{submittingDocs ? 'Sending to Admin...' : 'Submit to Admin for Re-inspection'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* FULL SCREEN DOCUMENT PREVIEW MODAL */}
      <DocumentViewerModal
        doc={previewDocModal}
        isOpen={Boolean(previewDocModal)}
        onClose={() => setPreviewDocModal(null)}
      />

    </div>
  );
};
