import React, { useState, useEffect } from 'react';
import { useAuth, SUPPORT_CONTACTS } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import {
  Store, Utensils, CreditCard, Users, BarChart3,
  IndianRupee, Navigation, Bell, Star, UserCheck, Shield, Palette,
  HelpCircle, FileText, LogOut, Save, Plus, Trash2,
  Clock, MapPin, Phone, Mail, CheckCircle2, AlertCircle,
  ChevronRight, Reply, RefreshCw, Upload, MessageSquare
} from 'lucide-react';
import { fetchLiveLocationZomatoStyle } from '../../utils/geolocation';
import { validatePassword } from '../../utils/passwordValidator';
import { PasswordStrengthIndicator } from '../common/PasswordStrengthIndicator';

export const OwnerSettingsView = ({ onMenuUpdated }) => {
  const { currentUser, updateProfile, logout } = useAuth();
  const { showToast } = useNotification();

  // Active section among the 14 sections
  const [activeSection, setActiveSection] = useState('profile');

  // 1. Mess Profile State
  const [messName, setMessName] = useState(currentUser?.messName || '');
  const [ownerName, setOwnerName] = useState(currentUser?.name || '');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [coverImage, setCoverImage] = useState('');
  const [messCoverUploading, setMessCoverUploading] = useState(false);
  const [address, setAddress] = useState('');
  const [mapsLocation, setMapsLocation] = useState('');
  const [aboutMess, setAboutMess] = useState('');
  const [timingBreakfast, setTimingBreakfast] = useState('07:30 AM - 10:00 AM');
  const [timingLunch, setTimingLunch] = useState('12:30 PM - 03:30 PM');
  const [timingDinner, setTimingDinner] = useState('07:30 PM - 10:30 PM');
  const [savingProfile, setSavingProfile] = useState(false);

  // Handle Mess Cover / Logo upload from device
  const handleCoverImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be under 5MB', 'error');
      return;
    }

    setMessCoverUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverImage(event.target.result);
      setMessCoverUploading(false);
      showToast(`Selected "${file.name}". Click "Save Mess Profile Settings" to apply.`, 'info', '📷 Photo Selected');
    };
    reader.onerror = () => {
      setMessCoverUploading(false);
      showToast('Failed to read image file', 'error');
    };
    reader.readAsDataURL(file);
  };

  // 2. Food & Menu Settings State
  const [isPureVeg, setIsPureVeg] = useState(false);
  const [specialSundayMeal, setSpecialSundayMeal] = useState('');
  const [addonsList, setAddonsList] = useState([]);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');

  // 3. Subscription & Pricing State
  const [monthlyPriceAll, setMonthlyPriceAll] = useState(3200);
  const [monthlyPriceTwo, setMonthlyPriceTwo] = useState(2560);
  const [weeklyPlanPrice, setWeeklyPlanPrice] = useState(900);
  const [trialMealPrice, setTrialMealPrice] = useState(70);
  const [enableTrial, setEnableTrial] = useState(true);
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [discountCode, setDiscountCode] = useState('');

  // 4. Customer Management State
  const [autoApproveSub, setAutoApproveSub] = useState(true);
  const [autoApproveTrial, setAutoApproveTrial] = useState(true);
  const [pauseNoticeHours, setPauseNoticeHours] = useState(12);
  const [maxPauseDaysPerMonth, setMaxPauseDaysPerMonth] = useState(7);

  // 5. Mess Operations State
  const [dailyCapacity, setDailyCapacity] = useState(100);
  const [expectedToday, setExpectedToday] = useState(0);
  const [predictedTomorrow, setPredictedTomorrow] = useState(0);
  const [bufferPlates, setBufferPlates] = useState(5);
  const [autoMealCountAI, setAutoMealCountAI] = useState(true);

  // 6. Payments & Finance State
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankBeneficiary, setBankBeneficiary] = useState(currentUser?.name || '');

  // 7. Notifications Toggles
  const [notifNewSub, setNotifNewSub] = useState(true);
  const [notifPaymentReceived, setNotifPaymentReceived] = useState(true);
  const [notifSubExpiry, setNotifSubExpiry] = useState(true);
  const [notifCancellation, setNotifCancellation] = useState(true);
  const [notifNewReview, setNotifNewReview] = useState(true);
  const [notifLowCapacity, setNotifLowCapacity] = useState(true);
  const [notifMealCountReminder, setNotifMealCountReminder] = useState(true);

  // 8. Reviews State
  const [reviews, setReviews] = useState([]);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyDraft, setReplyDraft] = useState('');

  // 9. Staff Management State
  const [staffMembers, setStaffMembers] = useState([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Helper');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  // 10. Security State
  const [currentOwnerPassword, setCurrentOwnerPassword] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [confirmOwnerPassword, setConfirmOwnerPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [savingOwnerPassword, setSavingOwnerPassword] = useState(false);

  // 11. Appearance State
  const [ownerTheme, setOwnerTheme] = useState('Light');
  const [ownerLanguage, setOwnerLanguage] = useState('English');

  // Load real mess details from DB
  useEffect(() => {
    const loadRealMessDetails = async () => {
      if (!currentUser?.messId) return;
      try {
        const res = await api.getMessDetails(currentUser.messId);
        if (res && res.mess) {
          const m = res.mess;
          setMessName(m.name || currentUser?.messName || '');
          setOwnerName(currentUser?.name || '');
          setContactPhone(m.phone || currentUser?.phone || '');
          setContactEmail(m.email || currentUser?.email || '');
          setAddress(m.address || (m.area ? `${m.area}, ${m.city || 'Pune'}` : ''));
          setCoverImage(m.coverImage || '');
          setAboutMess(m.description || '');
          if (m.timings) {
            if (m.timings.breakfast) setTimingBreakfast(m.timings.breakfast);
            if (m.timings.lunch) setTimingLunch(m.timings.lunch);
            if (m.timings.dinner) setTimingDinner(m.timings.dinner);
          }
          setIsPureVeg(Boolean(m.isPureVeg));
          if (m.pricePerMonth) setMonthlyPriceAll(m.pricePerMonth);
          if (m.trialPrice) setTrialMealPrice(m.trialPrice);
          if (m.reviews) setReviews(m.reviews);
        }
      } catch (err) {
        console.warn('[OwnerSettingsView] Error loading mess details:', err);
      }
    };
    loadRealMessDetails();
  }, [currentUser?.messId]);

  // The 14 sections specification
  const settingsSections = [
    { id: 'profile', label: '1. 🏪 Mess Profile', icon: Store },
    { id: 'menu', label: '2. 🍽️ Food & Menu', icon: Utensils },
    { id: 'pricing', label: '3. 💳 Subscription & Pricing', icon: CreditCard },
    { id: 'customers', label: '4. 👥 Customer Management', icon: Users },
    { id: 'operations', label: '5. 📊 Mess Operations', icon: BarChart3 },
    { id: 'payments', label: '6. 💳 Payments & Finance', icon: IndianRupee },
    { id: 'notifications', label: '7. 🔔 Notifications', icon: Bell },
    { id: 'reviews', label: '8. ⭐ Reviews & Ratings', icon: Star },
    { id: 'staff', label: '9. 👨‍💼 Staff Management', icon: UserCheck },
    { id: 'security', label: '10. 🔐 Security', icon: Shield },
    { id: 'appearance', label: '11. 🎨 Appearance', icon: Palette },
    { id: 'support', label: '12. 🆘 Help & Support', icon: HelpCircle },
    { id: 'legal', label: '13. 📄 Legal', icon: FileText },
    { id: 'logout', label: '14. 🚪 Logout', icon: LogOut, danger: true }
  ];

  const [locatingKitchen, setLocatingKitchen] = useState(false);

  // Zomato-style Live Kitchen Location Detection
  const handleFetchLiveKitchenLocation = async () => {
    setLocatingKitchen(true);
    try {
      const resolved = await fetchLiveLocationZomatoStyle();
      const resolvedAddress = resolved.landmark
        ? `${resolved.landmark}, ${resolved.area}, ${resolved.city || 'Pune'} - ${resolved.pincode || '412105'}`
        : `${resolved.area}, ${resolved.city || 'Pune'} - ${resolved.pincode || '412105'}`;
      setAddress(resolvedAddress);
      if (resolved.coords?.lat && resolved.coords?.lng) {
        setMapsLocation(`${resolved.coords.lat.toFixed(5)}, ${resolved.coords.lng.toFixed(5)}`);
      }
      showToast(`Kitchen location set to: ${resolved.label}`, 'success', '📍 Live Kitchen GPS (Zomato-style)');
    } catch (e) {
      showToast('Could not fetch live GPS. Please enter your physical address manually.', 'error');
    } finally {
      setLocatingKitchen(false);
    }
  };

  // Save Mess Profile to DB (updates BOTH user profile and mess record)
  const handleSaveMessProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        name: ownerName,
        phone: contactPhone,
        email: contactEmail,
        messName,
        address,
        description: aboutMess
      });

      if (currentUser?.messId) {
        await api.updateMess(currentUser.messId, {
          name: messName,
          phone: contactPhone,
          whatsapp: contactPhone,
          email: contactEmail,
          address,
          description: aboutMess,
          coverImage,
          timings: {
            breakfast: timingBreakfast,
            lunch: timingLunch,
            dinner: timingDinner
          },
          isPureVeg
        });
      }

      showToast('Mess Profile details saved to database!', 'success', '🏪 Profile Updated');
    } catch (err) {
      showToast('Failed to save mess profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Password
  const handleChangeOwnerPassword = async (e) => {
    e.preventDefault();
    const pwCheck = validatePassword(newOwnerPassword);
    if (!pwCheck.isValid) {
      showToast('Please satisfy all password rules!', 'error', '⚠️ Weak Password');
      return;
    }
    if (newOwnerPassword !== confirmOwnerPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setSavingOwnerPassword(true);
    try {
      const res = await api.changePassword({
        userId: currentUser?.id,
        currentPassword: currentOwnerPassword,
        newPassword: newOwnerPassword
      });
      if (res && res.success) {
        showToast('Mess owner password updated!', 'success', '🔐 Password Changed');
        setCurrentOwnerPassword('');
        setNewOwnerPassword('');
        setConfirmOwnerPassword('');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setSavingOwnerPassword(false);
    }
  };

  // Add Add-on Item
  const handleAddAddon = (e) => {
    e.preventDefault();
    if (!newAddonName || !newAddonPrice) return;
    setAddonsList(prev => [...prev, { id: Date.now(), name: newAddonName, price: Number(newAddonPrice) }]);
    setNewAddonName('');
    setNewAddonPrice('');
    showToast(`Added ${newAddonName} to menu add-ons!`, 'success');
  };

  // Add Staff Member
  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffPhone) return;
    setStaffMembers(prev => [...prev, {
      id: Date.now(),
      name: newStaffName,
      role: newStaffRole,
      phone: newStaffPhone,
      status: 'Active'
    }]);
    setNewStaffName('');
    setNewStaffPhone('');
    showToast(`Staff member ${newStaffName} registered!`, 'success');
  };

  // Reply to review
  const handleReplyReview = (reviewId) => {
    if (!replyDraft.trim()) return;
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply: replyDraft.trim() } : r));
    setReplyDraft('');
    setActiveReplyId(null);
    showToast('Reply published to student review!', 'success');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-150">
      
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center font-black text-xl shadow-md">
            🏪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black">{messName}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Partner Settings Hub
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Owner: {ownerName} • {contactPhone}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold text-xs transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Settings Grid: Navigation Sidebar + Active Setting Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Navigation Sidebar (The 14 Sections) */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-3 border border-slate-200/80 shadow-2xs space-y-1 h-fit">
          <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Owner Settings Menu
          </div>

          <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
            {settingsSections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    if (sec.id === 'logout') {
                      logout();
                    } else {
                      setActiveSection(sec.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-left transition ${
                    sec.danger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : isActive
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{sec.label}</span>
                  </div>
                  <ChevronRight className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* ================= 1. MESS PROFILE ================= */}
          {activeSection === 'profile' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-orange-600" />
                  <div>
                    <h3 className="font-black text-slate-900 text-sm sm:text-base">1. 🏪 Mess Profile Settings</h3>
                    <p className="text-xs text-slate-500">Public details displayed to campus students</p>
                  </div>
                </div>
                <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  MITAOE Alandi & Pune DB
                </span>
              </div>

              <form onSubmit={handleSaveMessProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mess Name</label>
                    <input
                      type="text"
                      required
                      value={messName}
                      onChange={(e) => setMessName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Owner Full Name</label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Owner Email Address</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Mess Physical Address</label>
                    <button
                      type="button"
                      onClick={handleFetchLiveKitchenLocation}
                      disabled={locatingKitchen}
                      className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 transition cursor-pointer bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${locatingKitchen ? 'animate-spin' : ''}`} />
                      <span>{locatingKitchen ? 'Locating Kitchen...' : '📍 Fetch Live Kitchen Location (Zomato-style)'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Near MITAOE Main Gate, Alandi Devachi, Pune 412105"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Auto-detects physical address with real locality name via GPS without IP addresses.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Google Maps Coordinates / Pin</label>
                    <input
                      type="text"
                      value={mapsLocation}
                      onChange={(e) => setMapsLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Mess Photo / Kitchen Cover Image</label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-24 h-20 rounded-xl bg-slate-900 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                        <img
                          src={coverImage || '/logo.jpeg'}
                          alt="Mess Logo"
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{messCoverUploading ? 'Loading...' : 'Upload Image'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleCoverImageUpload}
                              disabled={messCoverUploading}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setCoverImage('/logo.jpeg')}
                            className="px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                          >
                            Reset to Logo
                          </button>
                        </div>
                        <input
                          type="text"
                          value={coverImage}
                          onChange={(e) => setCoverImage(e.target.value)}
                          placeholder="Or paste image URL (https://...)"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">About Mess Description</label>
                  <textarea
                    rows={2}
                    value={aboutMess}
                    onChange={(e) => setAboutMess(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>

                {/* Opening & Closing Timings */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="font-bold text-xs text-slate-800">Serving & Operational Timings</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block mb-1">Breakfast</span>
                      <input
                        type="text"
                        value={timingBreakfast}
                        onChange={(e) => setTimingBreakfast(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block mb-1">Lunch</span>
                      <input
                        type="text"
                        value={timingLunch}
                        onChange={(e) => setTimingLunch(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block mb-1">Dinner</span>
                      <input
                        type="text"
                        value={timingDinner}
                        onChange={(e) => setTimingDinner(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Mess Profile Settings'}</span>
                </button>
              </form>
            </div>
          )}

          {/* ================= 2. FOOD & MENU SETTINGS ================= */}
          {activeSection === 'menu' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Utensils className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">2. 🍽️ Food & Menu Settings</h3>
                  <p className="text-xs text-slate-500">Diet categories, special Sunday feasts, and add-ons</p>
                </div>
              </div>

              {/* Diet Options Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="font-bold text-xs text-slate-800">Cuisine & Diet Category</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPureVeg(true)}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      isPureVeg ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <span>100% Pure Veg 🥗</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPureVeg(false)}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      !isPureVeg ? 'bg-amber-50 border-amber-500 text-amber-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <span>Veg & Non-Veg 🍗</span>
                  </button>
                </div>
              </div>

              {/* Special Feast Dish */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Weekly Sunday Feast Special</label>
                <input
                  type="text"
                  value={specialSundayMeal}
                  onChange={(e) => setSpecialSundayMeal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              {/* Add-ons List & New Add-on Form */}
              <div className="space-y-3">
                <div className="font-bold text-xs text-slate-800">Extra Items & Add-ons (Student Counter)</div>
                <div className="space-y-2">
                  {addonsList.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="font-bold text-slate-800">{item.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900">₹{item.price}</span>
                        <button
                          onClick={() => setAddonsList(prev => prev.filter(a => a.id !== item.id))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddAddon} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="e.g. Masala Buttermilk"
                    value={newAddonName}
                    onChange={(e) => setNewAddonName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={newAddonPrice}
                    onChange={(e) => setNewAddonPrice(e.target.value)}
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </form>
              </div>

              <button
                onClick={() => showToast('Food and menu settings updated!', 'success')}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Save Menu Settings
              </button>
            </div>
          )}

          {/* ================= 3. SUBSCRIPTION & PRICING ================= */}
          {activeSection === 'pricing' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <CreditCard className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">3. 💳 Subscription & Pricing Plans</h3>
                  <p className="text-xs text-slate-500">Configure monthly plans, trials, and deposit rules</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly: All Meals (3 Meals/Day)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={monthlyPriceAll}
                      onChange={(e) => setMonthlyPriceAll(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly: 2 Meals (Lunch & Dinner)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={monthlyPriceTwo}
                      onChange={(e) => setMonthlyPriceTwo(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Weekly Plan (7 Days)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={weeklyPlanPrice}
                      onChange={(e) => setWeeklyPlanPrice(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trial Single Meal Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={trialMealPrice}
                      onChange={(e) => setTrialMealPrice(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">Accept Student Trial Meals</div>
                    <div className="text-[11px] text-slate-400">Enables high-conversion one-meal bookings</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableTrial}
                    onChange={(e) => setEnableTrial(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded-md"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">Tiffin Dabba Deposit (₹)</span>
                    <input
                      type="number"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">Active Promo Discount Code</span>
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg uppercase"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => showToast('Subscription plans and pricing updated!', 'success')}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Save Pricing Settings
              </button>
            </div>
          )}

          {/* ================= 4. CUSTOMER MANAGEMENT ================= */}
          {activeSection === 'customers' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Users className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">4. 👥 Customer Management Rules</h3>
                  <p className="text-xs text-slate-500">Approvals, holiday pause limits, and dining rules</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-800">Auto-Approve New Subscriptions</div>
                    <div className="text-[11px] text-slate-400">Automatically activate passes upon successful student payment</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoApproveSub}
                    onChange={(e) => setAutoApproveSub(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded-md"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-800">Trial Meal Instant Approval</div>
                    <div className="text-[11px] text-slate-400">Permit instant QR code generation for verified students</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoApproveTrial}
                    onChange={(e) => setAutoApproveTrial(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded-md"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Pause Notice Requirement (Hours)</label>
                    <input
                      type="number"
                      value={pauseNoticeHours}
                      onChange={(e) => setPauseNoticeHours(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <span className="text-[10px] text-slate-400">Students must pause at least 12h before next meal</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Max Pause Days Per Month</label>
                    <input
                      type="number"
                      value={maxPauseDaysPerMonth}
                      onChange={(e) => setMaxPauseDaysPerMonth(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <span className="text-[10px] text-slate-400">Max days students can credit for exam/holidays</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => showToast('Customer management rules saved!', 'success')}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Save Customer Rules
              </button>
            </div>
          )}

          {/* ================= 5. MESS OPERATIONS ================= */}
          {activeSection === 'operations' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">5. 📊 Mess Operations & Wastage AI</h3>
                  <p className="text-xs text-slate-500">Meal count capacity, forecast buffer, and food efficiency</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200">
                  <div className="text-[11px] font-bold text-orange-800">Daily Capacity</div>
                  <input
                    type="number"
                    value={dailyCapacity}
                    onChange={(e) => setDailyCapacity(e.target.value)}
                    className="w-20 mx-auto text-center text-xl font-black bg-transparent text-slate-900 mt-1"
                  />
                  <div className="text-[10px] text-slate-500">Max plates / meal</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-700">Expected Today</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{expectedToday}</div>
                  <div className="text-[10px] text-slate-400">Based on active pauses</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-700">Forecast Tomorrow</div>
                  <div className="text-xl font-black text-emerald-700 mt-1">{predictedTomorrow}</div>
                  <div className="text-[10px] text-slate-400">AI prediction</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">Automatic Meal-Count Estimation AI</div>
                    <div className="text-[11px] text-slate-400">Accounts for holiday calendars and college exam schedules</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoMealCountAI}
                    onChange={(e) => setAutoMealCountAI(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded-md"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div>
                    <div className="font-bold text-slate-800">Extra Buffer Plates</div>
                    <div className="text-[11px] text-slate-400">Emergency buffer prepared for walk-ins</div>
                  </div>
                  <input
                    type="number"
                    value={bufferPlates}
                    onChange={(e) => setBufferPlates(e.target.value)}
                    className="w-16 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold"
                  />
                </div>
              </div>

              <button
                onClick={() => showToast('Mess operations settings saved!', 'success')}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Save Operational Capacity
              </button>
            </div>
          )}

          {/* ================= 6. PAYMENTS & FINANCE ================= */}
          {activeSection === 'payments' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <IndianRupee className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">6. 💰 Payments & Bank Settlement</h3>
                  <p className="text-xs text-slate-500">Configure UPI ID and direct bank account deposits</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold">0% Commission Promotional Partner</div>
                  <div className="text-[11px] text-emerald-700">100% of student subscription fees transferred directly to you</div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-200 text-emerald-900 font-extrabold text-[10px] rounded-full">Active</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mess UPI VPA Address</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Beneficiary Name</label>
                  <input
                    type="text"
                    value={bankBeneficiary}
                    onChange={(e) => setBankBeneficiary(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank IFSC Code</label>
                  <input
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                  />
                </div>
              </div>

              <button
                onClick={() => showToast('Bank settlement details updated!', 'success')}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Save Banking & Settlement Details
              </button>
            </div>
          )}

          {/* ================= 7. NOTIFICATIONS ================= */}
          {activeSection === 'notifications' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Bell className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">7. 🔔 Owner Notification Preferences</h3>
                  <p className="text-xs text-slate-500">Real-time alerts for subscriptions and entrance check-ins</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'New student subscription booked', val: notifNewSub, set: setNotifNewSub },
                  { label: 'Instant payment received via UPI', val: notifPaymentReceived, set: setNotifPaymentReceived },
                  { label: 'Subscription expiry alerts (3 days prior)', val: notifSubExpiry, set: setNotifSubExpiry },
                  { label: 'Customer cancellation or refund requests', val: notifCancellation, set: setNotifCancellation },
                  { label: 'New rating or review submitted by student', val: notifNewReview, set: setNotifNewReview },
                  { label: 'Low meal capacity warning (>90% full)', val: notifLowCapacity, set: setNotifLowCapacity },
                  { label: 'Morning daily meal-count preparation reminder', val: notifMealCountReminder, set: setNotifMealCountReminder }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.val}
                      onChange={(e) => item.set(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded-md"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => showToast('Notification alerts updated!', 'success')}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Save Notification Preferences
              </button>
            </div>
          )}

          {/* ================= 8. REVIEWS & RATINGS ================= */}
          {activeSection === 'reviews' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <div>
                    <h3 className="font-black text-slate-900 text-base">8. ⭐ Reviews & Student Ratings</h3>
                    <p className="text-xs text-slate-500">
                      Overall Rating: {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1) : '0.0'} / 5.0 ({reviews.length} Student Reviews)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900">
                    {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1) : '0.0'}
                  </span>
                  <span className="text-xs text-amber-500 ml-1">★</span>
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="font-semibold text-slate-600">No student reviews yet</p>
                  <p className="text-[11px] text-slate-400">Reviews submitted by your subscribers will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(rev => (
                    <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900">{rev.student || rev.userName}</div>
                        <div className="text-slate-400 text-[11px]">{rev.date} • {rev.rating} ★</div>
                      </div>
                      <p className="text-slate-700">{rev.text || rev.comment}</p>

                      {rev.reply || rev.ownerResponse ? (
                        <div className="mt-2 p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 text-[11px]">
                          <span className="font-bold block">Owner Response:</span>
                          {rev.reply || rev.ownerResponse}
                        </div>
                      ) : (
                        activeReplyId === rev.id ? (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Write your polite reply..."
                              value={replyDraft}
                              onChange={(e) => setReplyDraft(e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                            />
                            <button
                              onClick={() => handleReplyReview(rev.id)}
                              className="px-3 py-1.5 bg-orange-600 text-white rounded-xl font-bold"
                            >
                              Reply
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveReplyId(rev.id)}
                            className="text-[11px] text-orange-600 font-bold hover:underline flex items-center gap-1 mt-1"
                          >
                            <Reply className="w-3 h-3" />
                            <span>Reply to Student</span>
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= 9. STAFF MANAGEMENT ================= */}
          {activeSection === 'staff' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <UserCheck className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">9. 👨‍💼 Mess Staff & Permissions</h3>
                  <p className="text-xs text-slate-500">Cooks, scanner attendants, and kitchen helpers</p>
                </div>
              </div>

              {staffMembers.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="font-semibold text-slate-600">No staff members added yet</p>
                  <p className="text-[11px] text-slate-400">Use the form below to register kitchen helpers or scanner attendants.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {staffMembers.map(staff => (
                    <div key={staff.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{staff.name}</div>
                        <div className="text-slate-500 text-[11px]">{staff.role} • {staff.phone}</div>
                      </div>
                      <button
                        onClick={() => setStaffMembers(prev => prev.filter(s => s.id !== staff.id))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Staff Form */}
              <form onSubmit={handleAddStaff} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="font-bold text-slate-800">Add New Staff Member</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Staff Full Name"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="Head Chef">Head Chef</option>
                    <option value="Assistant Cook">Assistant Cook</option>
                    <option value="Counter Scanner">Counter Scanner</option>
                    <option value="Helper">Helper / Cleaning</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                >
                  Register Staff Member
                </button>
              </form>
            </div>
          )}

          {/* ================= 10. SECURITY ================= */}
          {activeSection === 'security' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Shield className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">10. 🔐 Partner Security & Access</h3>
                  <p className="text-xs text-slate-500">Change password, active devices, and two-factor authentication</p>
                </div>
              </div>

              <form onSubmit={handleChangeOwnerPassword} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="font-bold text-slate-800">Change Mess Owner Password</div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentOwnerPassword}
                    onChange={(e) => setCurrentOwnerPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newOwnerPassword}
                      onChange={(e) => setNewOwnerPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmOwnerPassword}
                      onChange={(e) => setConfirmOwnerPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <PasswordStrengthIndicator password={newOwnerPassword} />
                <button
                  type="submit"
                  disabled={savingOwnerPassword}
                  className="py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl"
                >
                  {savingOwnerPassword ? 'Updating...' : 'Update Password in DB'}
                </button>
              </form>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">Two-Factor Authentication (2FA)</div>
                    <div className="text-[11px] text-slate-500">Require SMS OTP when logging into owner portal from a new browser</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={twoFactorEnabled}
                    onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded-md"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600">Active Login Session: Chrome on Windows 11</span>
                  <button
                    onClick={logout}
                    className="text-rose-600 font-bold hover:underline"
                  >
                    Logout All Devices
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= 11. APPEARANCE ================= */}
          {activeSection === 'appearance' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Palette className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">11. 🎨 Appearance & Localization</h3>
                  <p className="text-xs text-slate-500">Theme mode and regional portal languages</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-2">Portal Theme</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Light', 'Dark Night'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setOwnerTheme(m);
                          showToast(`Theme set to ${m}`, 'info');
                        }}
                        className={`p-3 rounded-2xl border font-bold transition text-center ${
                          ownerTheme === m ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {m} Mode
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-2">Partner Language</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { code: 'English', label: 'English' },
                      { code: 'Hindi', label: 'हिन्दी' },
                      { code: 'Marathi', label: 'मराठी' }
                    ].map(l => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setOwnerLanguage(l.code);
                          showToast(`Language set to ${l.label}`, 'success');
                        }}
                        className={`p-2.5 rounded-xl border font-bold transition text-center ${
                          ownerLanguage === l.code ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= 12. HELP & SUPPORT ================= */}
          {activeSection === 'support' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <HelpCircle className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">12. 🆘 Owner Help & Priority Support</h3>
                  <p className="text-xs text-slate-500">Partner helpline, operational guides, and billing inquiries</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Partner Dedicated Helplines & Admin Support
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {SUPPORT_CONTACTS.map((person) => {
                    const isAdmin = person.type === 'admin';
                    return (
                      <div
                        key={person.id}
                        className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                          isAdmin
                            ? 'bg-indigo-50/70 border-indigo-200'
                            : 'bg-slate-50/80 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-slate-900 text-sm truncate">
                              {person.name}
                            </span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              isAdmin
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {person.badge}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {person.role}
                          </div>
                          <div className="text-xs font-mono font-bold text-slate-800 mt-1">
                            {person.formattedPhone}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <a
                            href={person.callUrl}
                            className="py-2 px-2.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </a>
                          <a
                            href={person.whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="py-2 px-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-800">Partner Knowledgebase</div>
                {[
                  { q: 'What should I do if a student requests a subscription refund?', a: 'MessConnect operates under a strict NO REFUND POLICY for students. However, if an exceptional situation arises (e.g., student illness or dispute), the student and mess owner can contact each other directly to agree upon a mutual off-platform resolution.' },
                  { q: 'Who do I contact regarding platform commission disputes or questions?', a: 'Platform commission issues can ONLY be solved by the Admin. Do not discuss commission disputes with students. Contact Admin Support directly: Rohit (8766793139), Shreyash (9309294400), or Parth (9423490513) for prompt ledger adjustment.' },
                  { q: 'How do student meal pass scans work?', a: 'Open the Entrance Scanner tab on any smartphone or tablet. When students present their PIN or QR, the camera scans in under 1 second and immediately registers their attendance.' },
                  { q: 'When are monthly subscription payouts settled?', a: 'Upfront payments made by students are settled to your linked bank account every business day at 09:00 AM after deduction of the agreed platform commission.' },
                  { q: 'What happens when a student pauses their subscription?', a: 'When a student pauses for college holidays, the demand forecast AI immediately subtracts their plate from tomorrow’s cooking count, saving you food wastage.' }
                ].map((item, idx) => (
                  <details key={idx} className="group p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <summary className="font-bold text-slate-800 flex justify-between select-none">
                      <span>{item.q}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition" />
                    </summary>
                    <p className="mt-2 text-slate-600 text-[11px] leading-relaxed">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* ================= 13. LEGAL ================= */}
          {activeSection === 'legal' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <FileText className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">13. 📄 Legal & Compliance Guidelines</h3>
                  <p className="text-xs text-slate-500">Partner agreement, FSSAI regulations, and policies</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">MessConnect Merchant Agreement</div>
                  <p className="text-[11px] leading-relaxed">
                    By listing on MessConnect, mess owners agree to serve hygienic, freshly prepared meals in accordance with local municipal and food safety authorities.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">Cancellation & Refund Policy</div>
                  <p className="text-[11px] leading-relaxed">
                    Subscriptions paused due to official university examinations are credited to the student as extended days rather than cash refunds.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">Student Privacy & Data Protection</div>
                  <p className="text-[11px] leading-relaxed">
                    Mess owners may use student mobile numbers and dietary information solely for meal verification and dietary safety.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
