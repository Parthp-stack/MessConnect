import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  User, Camera, Upload, Check, X, Phone, Mail,
  GraduationCap, Building, ShieldCheck, Sparkles, CheckCircle2
} from 'lucide-react';

export const StudentProfileModal = ({ isOpen, onClose, subscriptions = [] }) => {
  const { currentUser, updateProfile } = useAuth();
  const { showToast } = useNotification();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [hostel, setHostel] = useState('');
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (currentUser && isOpen) {
      setName(currentUser.name || '');
      setAvatar(currentUser.avatar || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');
      setCollege(currentUser.college || 'MITAOE Alandi');
      setHostel(currentUser.hostel || 'Hostel Campus');
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('Image file size must be under 3MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result);
      showToast('Photo selected! Click "Save Changes" to apply.', 'info', '📸 Photo Ready');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your full name', 'error');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      showToast('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        avatar: avatar || undefined,
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        college: college.trim(),
        hostel: hostel.trim()
      });

      if (res?.success) {
        showToast('Profile updated! Your name and photo are updated everywhere.', 'success', '👤 Profile Saved');
        if (onClose) onClose();
      } else {
        showToast('Profile updated locally.', 'info');
        if (onClose) onClose();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeSub = subscriptions.find(s => s.status === 'ACTIVE') || subscriptions[0];
  const isEmojiAvatar = avatar && avatar.length <= 4 && !avatar.startsWith('http') && !avatar.startsWith('data:');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 pb-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between relative">
          <div>
            <div className="flex items-center gap-1.5 text-orange-100 text-[10px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-200" />
              <span>Student Profile Settings</span>
            </div>
            <h3 className="text-lg font-black text-white mt-0.5">Edit Student Details</h3>
            <p className="text-xs text-orange-100">
              Update your photo, name, and contact details
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Avatar / Photo Upload & Selector */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-center">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-md mx-auto overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                {isEmojiAvatar ? (
                  <span className="text-4xl select-none">{avatar}</span>
                ) : avatar ? (
                  <img src={avatar} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl select-none">👨‍🎓</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-md border-2 border-white transition cursor-pointer"
                title="Upload Photo from Device"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />

            <div>
              <div className="font-bold text-slate-800 text-xs">{name || 'Student Name'}</div>
              <div className="text-[11px] text-slate-500">
                Tap camera to upload custom photo, or pick an avatar preset below:
              </div>
            </div>

            {/* Avatar Presets Grid */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setAvatar(preset.icon)}
                  className={`px-2 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    avatar === preset.icon
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span className="text-[10px]">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nilesh Patil"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  College / University
                </label>
                <div className="relative">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. MITAOE Alandi"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Hostel / Room
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={hostel}
                    onChange={(e) => setHostel(e.target.value)}
                    placeholder="e.g. Ganga Hostel, Room 402"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Subscription Badge if present */}
          {activeSub && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-950">{activeSub.messName || 'Active Mess'}</div>
                  <div className="text-[10px] text-emerald-700">{activeSub.planName || 'Monthly Plan'} • Valid till {activeSub.validUntil || activeSub.endDate}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                Active Pass
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
