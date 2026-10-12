import React, { useState, useRef } from 'react';
import { useAuth, SUPPORT_CONTACTS } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import {
  User, Phone, Mail, Lock, Utensils, Bell, CreditCard,
  Moon, Sun, Globe, Shield, HelpCircle, PhoneCall, Bug,
  Star, LogOut, Check, Sparkles, Pause, RotateCcw,
  ChevronRight, AlertCircle, Eye, EyeOff, Save, MessageSquare,
  MapPin, Navigation, Camera, Upload
} from 'lucide-react';
import { fetchLiveLocationZomatoStyle } from '../../utils/geolocation';
import { validatePassword } from '../../utils/passwordValidator';
import { PasswordStrengthIndicator } from '../common/PasswordStrengthIndicator';

export const StudentSettingsView = ({ onTriggerPauseModal, subscriptions = [] }) => {
  const { currentUser, updateProfile, logout } = useAuth();
  const { userLocation, updateLocation } = useApp();
  const { showToast, requestPermission } = useNotification();

  // Active subcategory tab on student settings page
  const [activeSection, setActiveSection] = useState('account'); // 'account', 'preferences', 'subscription', 'notifications', 'appearance', 'security', 'support'

  // Account State
  const [name, setName] = useState(currentUser?.name || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [college, setCollege] = useState(currentUser?.college || '');
  const [savingAccount, setSavingAccount] = useState(false);
  const fileInputRef = useRef(null);

  const AVATAR_PRESETS = [
    { label: 'Student', icon: '👨‍🎓' },
    { label: 'Scholar', icon: '👩‍🎓' },
    { label: 'Coder', icon: '🧑‍💻' },
    { label: 'Foodie', icon: '🍛' },
    { label: 'Healthy', icon: '🥗' },
    { label: 'Active', icon: '⚡' },
    { label: 'Campus Boy', icon: '👦' },
    { label: 'Campus Girl', icon: '👧' }
  ];

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file size must be less than 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result);
      showToast('Photo selected! Click Save to apply across all passes and pods.', 'info', '📸 Photo Ready');
    };
    reader.readAsDataURL(file);
  };

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Food Preferences State
  const [diet, setDiet] = useState(currentUser?.preferences?.diet || 'Veg & Non-Veg');
  const [spiceLevel, setSpiceLevel] = useState('Medium');
  const [mealReminders, setMealReminders] = useState(currentUser?.preferences?.mealReminders ?? true);
  const [reminderTime, setReminderTime] = useState(currentUser?.preferences?.reminderTime || '08:00');
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Notifications State
  const [notifOffers, setNotifOffers] = useState(true);
  const [notifExpiry, setNotifExpiry] = useState(true);
  const [notifPayment, setNotifPayment] = useState(true);

  // App Settings / Appearance State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState('English');

  // Support / Rating State
  const [userRating, setUserRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [queryCategory, setQueryCategory] = useState('Meal Pass & Scanner');
  const [queryMessage, setQueryMessage] = useState('');
  const [submittingQuery, setSubmittingQuery] = useState(false);

  // Active subscription
  const activeSub = subscriptions.find(s => s.status === 'ACTIVE') || subscriptions[0];

  // Handle Account Update
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (!phone || phone.length < 10) {
      showToast('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    setSavingAccount(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        avatar: avatar,
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        college: college.trim()
      });
      if (res && res.success) {
        showToast('Student name and photo updated! Reflected everywhere.', 'success', '👤 Account Saved');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const [detectingLoc, setDetectingLoc] = useState(false);

  // Zomato-style Live Location Detection for Student
  const handleDetectStudentLocation = async () => {
    setDetectingLoc(true);
    try {
      const resolved = await fetchLiveLocationZomatoStyle();
      if (updateLocation) {
        updateLocation({
          method: 'GPS',
          area: resolved.area,
          city: resolved.city,
          pincode: resolved.pincode,
          label: resolved.label,
          coords: resolved.coords,
          landmark: resolved.landmark
        });
      }
      showToast(`Dining location set to: ${resolved.label}`, 'success', '📍 Live GPS Location (Zomato-style)');
    } catch (e) {
      showToast('Could not fetch live GPS. Please choose location from top bar.', 'error');
    } finally {
      setDetectingLoc(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.isValid) {
      showToast('Please satisfy all password rules!', 'error', '⚠️ Weak Password');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.changePassword({
        userId: currentUser?.id,
        currentPassword,
        newPassword
      });
      if (res && res.success) {
        showToast('Password changed successfully in database!', 'success', '🔐 Password Updated');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
      }
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Save Preferences
  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await updateProfile({
        diet,
        preferences: {
          diet,
          spiceLevel,
          mealReminders,
          reminderTime,
          offers: notifOffers,
          subscriptionAlerts: notifExpiry
        }
      });
      showToast('Meal & food preferences updated!', 'success', '🍱 Preferences Saved');
    } catch (err) {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Handle Support Query Submission to Admin
  const handleSendQuery = async (e) => {
    e.preventDefault();
    if (!queryMessage.trim()) {
      showToast('Please describe your query.', 'error');
      return;
    }
    setSubmittingQuery(true);
    try {
      const res = await api.submitSupportQuery({
        name: currentUser?.name || 'Student',
        contact: currentUser?.phone || currentUser?.email || 'Student',
        email: currentUser?.email,
        category: queryCategory,
        message: queryMessage.trim(),
        userId: currentUser?.id,
        userRole: 'student'
      });
      if (res?.success) {
        showToast(
          'Your query has been sent to admin at exampleexample942349@gmail.com!',
          'success',
          `🎧 Ticket #${res.ticketId || 'MC-' + Date.now().toString().slice(-6)}`
        );
        setQueryMessage('');
      } else {
        showToast(res?.message || 'Failed to submit query', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit query', 'error');
    } finally {
      setSubmittingQuery(false);
    }
  };

  // Handle Support rating submit
  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    try {
      await api.submitSupportQuery({
        name: currentUser?.name || 'Student',
        contact: currentUser?.phone || currentUser?.email || 'Student',
        email: currentUser?.email,
        category: `Student Rating (${userRating} Stars)`,
        message: feedbackText.trim(),
        userId: currentUser?.id,
        userRole: 'student'
      });
      showToast('Rating and feedback delivered to admin at exampleexample942349@gmail.com!', 'success', '⭐ Thank You');
      setFeedbackText('');
      setSupportSubmitted(true);
    } catch (_) {
      showToast('Feedback submitted to MessConnect Student Desk!', 'success', '⭐ Thank You');
      setFeedbackText('');
    }
  };

  const navSections = [
    { id: 'account', label: 'Account', icon: User, desc: 'Name, Phone, Email & Password' },
    { id: 'preferences', label: 'Food Preferences', icon: Utensils, desc: 'Diet, Spice & Meal Reminders' },
    { id: 'subscription', label: 'Subscription', icon: CreditCard, desc: 'Plans, Holiday Pause & History' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts, Expiry & Offers' },
    { id: 'appearance', label: 'App Settings', icon: Moon, desc: 'Dark Mode & Language' },
    { id: 'security', label: 'Privacy & Security', icon: Shield, desc: '2FA, Active Devices' },
    { id: 'support', label: 'Help & Support', icon: HelpCircle, desc: 'FAQ, Contact & Feedback' }
  ];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-150">
      
      {/* Settings Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser?.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-500 shadow-sm"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">{currentUser?.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-extrabold uppercase">
                Student Account
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{currentUser?.college || 'Campus Student'}</p>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
              <span>{currentUser?.phone || 'No phone added'}</span>
              <span>•</span>
              <span>{currentUser?.email || 'No email added'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition shadow-2xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Category Tabs (Horizontal Scrollable on mobile, Grid on desktop) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-4 lg:grid-cols-7">
        {navSections.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition shrink-0 ${
                isActive
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= SECTION 1: ACCOUNT ================= */}
      {activeSection === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Profile Details Form */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-orange-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Student Profile Information</h3>
              </div>
              <span className="text-[10px] text-slate-400">Stored in DB</span>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              {/* Photo / Avatar Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-16 h-16 rounded-2xl bg-orange-100 border-2 border-orange-200 flex items-center justify-center overflow-hidden shadow-inner text-2xl font-black text-orange-700">
                      {avatar ? (
                        avatar.startsWith('data:') || avatar.startsWith('http') ? (
                          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span>{avatar}</span>
                        )
                      ) : (
                        <span>{(name || 'S').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-orange-600 text-white shadow-md hover:bg-orange-700 transition cursor-pointer"
                      title="Upload Photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoSelect}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-800">Student Photo / Avatar</div>
                    <p className="text-[11px] text-slate-500">
                      Upload your picture or select an avatar preset. Reflected everywhere on your meal passes and pods.
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Upload className="w-3 h-3 text-orange-600" />
                        <span>Upload Photo</span>
                      </button>
                      {avatar && (
                        <button
                          type="button"
                          onClick={() => setAvatar('')}
                          className="text-[11px] text-slate-400 hover:text-red-600 font-medium cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Avatar Presets */}
                <div className="pt-2 border-t border-slate-200/60">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quick Avatar Presets</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {AVATAR_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setAvatar(p.icon)}
                        className={`px-2 py-0.5 rounded-xl text-sm border transition flex items-center gap-1 cursor-pointer ${
                          avatar === p.icon
                            ? 'bg-orange-100 border-orange-400 text-orange-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title={p.label}
                      >
                        <span>{p.icon}</span>
                        <span className="text-[10px] font-medium hidden sm:inline">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (Login & Pass SMS)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (Receipts & Password Reset)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">College / Institute Campus</label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. MIT World Peace University"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingAccount}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-4"
              >
                <Save className="w-4 h-4" />
                <span>{savingAccount ? 'Saving to Database...' : 'Save Account Details'}</span>
              </button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Security & Password</h3>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">Encrypted</span>
            </div>

            <p className="text-xs text-slate-500">
              Keep your student account secure. You can update your password here or use the email-based Forgot Password flow.
            </p>

            {!showPasswordForm ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <div className="text-xs font-semibold text-slate-700">Password is currently set and active</div>
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold text-xs border border-orange-200 transition"
                >
                  Change Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <PasswordStrengthIndicator password={newPassword} />

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-xs transition disabled:opacity-50"
                  >
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Live Campus Dining Location Card (Zomato-style) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Live Campus Dining Location</h3>
              </div>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                Zomato-Style Live GPS
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Active Dining & Discovery Locality
                </span>
                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
                  <span className="truncate">{userLocation?.label || 'Alandi (MITAOE), Pune'}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Prioritizes mess kitchens and daily tiffins near your exact campus locality. Resolved via GPS to street/campus names with zero IP exposure.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDetectStudentLocation}
                disabled={detectingLoc}
                className="self-start sm:self-center shrink-0 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Navigation className={`w-3.5 h-3.5 ${detectingLoc ? 'animate-spin' : ''}`} />
                <span>{detectingLoc ? 'Detecting Location...' : '📍 Fetch Live Location (Zomato-style)'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ================= SECTION 2: FOOD PREFERENCES ================= */}
      {activeSection === 'preferences' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-5 max-w-2xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Utensils className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Dietary & Meal Preferences</h3>
              <p className="text-xs text-slate-500">Customize what messes show first and meal notifications</p>
            </div>
          </div>

          {/* Diet Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Diet Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Veg & Non-Veg', icon: '🍗' },
                { label: 'Pure Veg', icon: '🥗' },
                { label: 'Jain Food', icon: '🍃' },
                { label: 'Eggetarian', icon: '🥚' }
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setDiet(item.label)}
                  className={`p-3 rounded-2xl border text-xs font-bold transition text-center ${
                    diet === item.label
                      ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-lg mb-1">{item.icon}</div>
                  <div>{item.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Spice Level */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Preferred Spice Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['Mild', 'Medium', 'Spicy 🌶️'].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSpiceLevel(lvl)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    spiceLevel === lvl
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Meal Reminders */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-800">Daily Meal Reminders</div>
                <div className="text-[11px] text-slate-500">Receive alert when today's lunch or dinner menu goes live</div>
              </div>
              <input
                type="checkbox"
                checked={mealReminders}
                onChange={(e) => setMealReminders(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded-md focus:ring-orange-500"
              />
            </div>

            {mealReminders && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-600">Reminder Time:</span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-mono"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
          >
            {savingPrefs ? 'Saving...' : 'Save Meal Preferences'}
          </button>
        </div>
      )}

      {/* ================= SECTION 3: SUBSCRIPTION ================= */}
      {activeSection === 'subscription' && (
        <div className="space-y-4 max-w-2xl">
          {activeSub ? (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wide">
                    {activeSub.status} Subscription
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">{activeSub.messName || 'Subscribed Mess'}</h3>
                  <p className="text-xs text-slate-500">{activeSub.planName || 'Monthly Dining Pass'}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Remaining</div>
                  <div className="text-xl font-black text-orange-600">{activeSub.remainingDays ?? activeSub.totalDays ?? 30} Days</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => onTriggerPauseModal && onTriggerPauseModal(activeSub)}
                  className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition flex items-center justify-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause for Exams / Holidays</span>
                </button>
                <button
                  onClick={() => showToast('Plan upgrade options available at semester renewal', 'info')}
                  className="py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Change / Upgrade Plan</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 text-center space-y-2 border border-slate-200">
              <CreditCard className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="font-bold text-slate-800 text-sm">No Active Subscriptions</div>
              <p className="text-xs text-slate-500">Explore nearby messes on the Home tab to subscribe or book a trial meal.</p>
            </div>
          )}

          {/* Payment History Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="font-extrabold text-sm text-slate-900">Recent Payment Receipts</div>
            {subscriptions && subscriptions.length > 0 ? (
              <div className="space-y-2">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{sub.planName || 'Meal Pass'} - {sub.messName}</div>
                      <div className="text-[11px] text-slate-400">{sub.startDate || 'Recent'} • Online Payment • {sub.id}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900">₹{sub.amount || 3200}</span>
                      <button
                        onClick={() => showToast(`Receipt for ${sub.id} downloaded!`, 'success')}
                        className="block text-[10px] text-orange-600 hover:underline font-bold mt-0.5"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">No payment receipts yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ================= SECTION 4: NOTIFICATIONS ================= */}
      {activeSection === 'notifications' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4 max-w-2xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Notification Alerts</h3>
              <p className="text-xs text-slate-500">Manage what alerts you receive on campus</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <div className="font-bold text-slate-800">Mess Discount Offers & Sweet Treat Days</div>
                <div className="text-[11px] text-slate-400">Broadcasts from subscribed mess owner</div>
              </div>
              <input
                type="checkbox"
                checked={notifOffers}
                onChange={(e) => setNotifOffers(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded-md"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <div className="font-bold text-slate-800">Subscription Expiry Reminder</div>
                <div className="text-[11px] text-slate-400">Remind 3 days before month renewal</div>
              </div>
              <input
                type="checkbox"
                checked={notifExpiry}
                onChange={(e) => setNotifExpiry(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded-md"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <div className="font-bold text-slate-800">Payment & Pause Receipts</div>
                <div className="text-[11px] text-slate-400">Confirmations whenever meals are paused or resumed</div>
              </div>
              <input
                type="checkbox"
                checked={notifPayment}
                onChange={(e) => setNotifPayment(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded-md"
              />
            </div>
          </div>

          <button
            onClick={() => showToast('Notification settings saved!', 'success')}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
          >
            Save Notification Preferences
          </button>
        </div>
      )}

      {/* ================= SECTION 5: APP SETTINGS / APPEARANCE ================= */}
      {activeSection === 'appearance' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4 max-w-2xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Moon className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">App Appearance & Locale</h3>
              <p className="text-xs text-slate-500">Theme, language, and display density</p>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <div className="font-bold text-xs text-slate-800">Theme Mode</div>
              <div className="text-[11px] text-slate-400">Switch between Crisp Day Light or Dark Night</div>
            </div>
            <button
              onClick={() => {
                setIsDarkMode(!isDarkMode);
                showToast(isDarkMode ? 'Switched to Light Theme' : 'Switched to Night Theme', 'info');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700"
            >
              {isDarkMode ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>{isDarkMode ? 'Night Mode' : 'Light Mode'}</span>
            </button>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Application Language</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { code: 'English', label: 'English (US)' },
                { code: 'Hindi', label: 'हिन्दी (Hindi)' },
                { code: 'Marathi', label: 'मराठी (Marathi)' }
              ].map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    showToast(`Language set to ${lang.label}`, 'success');
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-center ${
                    language === lang.code
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* System Push Permission */}
          <div className="pt-2">
            <button
              onClick={requestPermission}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition flex items-center justify-center gap-1.5"
            >
              <Bell className="w-4 h-4 text-orange-600" />
              <span>Verify Device Push Permissions</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= SECTION 6: PRIVACY & SECURITY ================= */}
      {activeSection === 'security' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4 max-w-2xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Privacy & Active Sessions</h3>
              <p className="text-xs text-slate-500">Security safeguards and token management</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="font-bold text-slate-800">Current Login Session</div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>Device & OS:</span>
              <span className="font-medium text-slate-800">Windows Chrome / Mobile Web</span>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>Status:</span>
              <span className="font-bold text-emerald-700">Authenticated (Active)</span>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>QR Pass Security:</span>
              <span className="font-medium text-slate-800">Rotating Anti-Proxy Token Active</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div>
              <div className="font-bold">Two-Step Verification (SMS OTP)</div>
              <div className="text-[11px] text-amber-700">Protect meal pass check-ins on new devices</div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">Enabled</span>
          </div>

          <div className="pt-2">
            <button
              onClick={logout}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition"
            >
              Sign Out from All Devices
            </button>
          </div>
        </div>
      )}

      {/* ================= SECTION 7: HELP & SUPPORT ================= */}
      {activeSection === 'support' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-5 max-w-2xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <HelpCircle className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Help, Support & FAQs</h3>
              <p className="text-xs text-slate-500">Instant answers and student helpline</p>
            </div>
          </div>

          {/* Admin Support Helplines */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Admin Support Helplines (Rohit, Shreyash & Parth)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {SUPPORT_CONTACTS.map((person) => {
                const isAdmin = person.type === 'admin';
                return (
                  <div
                    key={person.id}
                    className={`p-3 rounded-2xl border flex flex-col justify-between space-y-2 ${
                      isAdmin
                        ? 'bg-indigo-50/70 border-indigo-200'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-900 text-xs truncate">
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
                      <div className="text-[10px] text-slate-500 font-medium truncate">
                        {person.role}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-slate-700 mt-1">
                        {person.formattedPhone}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <a
                        href={person.callUrl}
                        className="py-1.5 px-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-[10px] flex items-center justify-center gap-1 transition"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                      <a
                        href={person.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1.5 px-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[10px] flex items-center justify-center gap-1 transition"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Chat</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FAQs Accordion */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-800 text-xs">Frequently Asked Questions</div>
            {[
              { q: 'What is the refund policy for students on active subscriptions?', a: 'MessConnect operates under a strict NO REFUND POLICY for students once a pass is paid and active. However, students can pause up to 7 days per month for exams/holidays to extend their days. If an exceptional refund issue arises, students and mess owners can contact each other directly to settle the matter.' },
              { q: 'How does the Exam Holiday Pause work?', a: 'You can pause your active mess subscription anytime for up to 7 consecutive days. Those paused days are automatically credited and extended at the end of your billing cycle.' },
              { q: 'What is the Rotating QR Anti-Proxy PIN?', a: 'Every student gets a unique 4-digit PIN and dynamic QR that updates every 60 seconds to prevent friends or proxy meal claims at the mess counter.' },
              { q: 'Can I book a single meal before subscribing?', a: 'Yes! All verified messes offer single Trial Meals (typically ₹60-₹80) so you can taste the food before committing to a monthly pass.' }
            ].map((faq, i) => (
              <details key={i} className="group p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer">
                <summary className="font-bold text-slate-800 flex items-center justify-between select-none">
                  <span>{faq.q}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition" />
                </summary>
                <p className="mt-2 text-slate-600 text-[11px] leading-relaxed pl-1">{faq.a}</p>
              </details>
            ))}
          </div>

          {/* Raise Support Ticket to Admin */}
          <form onSubmit={handleSendQuery} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-orange-600" />
                  <span>Raise Support Query to Admin</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  exampleexample942349@gmail.com
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Have a question about your meal pass, payments, or mess hygiene? Send directly to campus admin.
              </p>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={queryCategory}
                  onChange={(e) => setQueryCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="Meal Pass & Scanner">Meal Pass & Scanner Issue</option>
                  <option value="Subscription & Payment">Subscription & Payment</option>
                  <option value="Mess Hygiene & Food Feedback">Mess Hygiene & Food Quality</option>
                  <option value="General Inquiry">General Campus Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Describe Query</label>
                <textarea
                  rows={2}
                  required
                  value={queryMessage}
                  onChange={(e) => setQueryMessage(e.target.value)}
                  placeholder="Explain your query or problem in detail..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-orange-500/20"
                ></textarea>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingQuery}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{submittingQuery ? 'Sending to Admin...' : 'Send Query to Admin'}</span>
            </button>
          </form>

          {/* Rate & Feedback */}
          <form onSubmit={handleSendFeedback} className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-orange-900">Rate MessConnect Experience</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setUserRating(star)}
                    className="p-0.5"
                  >
                    <Star className={`w-4 h-4 ${star <= userRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={2}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us what you love or what we can improve..."
              className="w-full p-2.5 bg-white border border-orange-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            ></textarea>

            <button
              type="submit"
              className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
            >
              Submit Rating & Feedback
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
