import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  GraduationCap, Mail, Lock, ArrowRight, Sparkles,
  AlertCircle, ChevronLeft, Phone, ChefHat, Check
} from 'lucide-react';

export const StudentLogin = ({
  onNavigateToSignup,
  onNavigateToOwnerLogin,
  onOpenForgotPassword,
  onBackToHome,
  onLoginSuccess
}) => {
  const { login } = useAuth();
  const { showToast } = useNotification();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or mobile number.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login({
        identifier: identifier.trim(),
        password,
        role: 'CUSTOMER'
      });
      if (res && res.success) {
        showToast(`Welcome back, ${res.user?.name || 'Student'}!`, 'success', '🎓 Logged In');
        if (onLoginSuccess) onLoginSuccess(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      
      {/* Top Bar Navigation */}
      <div className="max-w-md sm:max-w-xl lg:max-w-4xl mx-auto w-full flex items-center justify-between mb-4">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Home / Explore</span>
        </button>

        <button
          onClick={onNavigateToOwnerLogin}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:text-orange-800 bg-orange-100/70 hover:bg-orange-100 px-3 py-1.5 rounded-full transition"
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>Mess Owner Portal</span>
        </button>
      </div>

      {/* Main Card Container */}
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden my-auto">
        
        {/* Banner */}
        <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 p-7 text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-extrabold text-[10px] tracking-wider uppercase">
                Student Portal
              </span>
              <h1 className="text-xl font-black tracking-tight mt-0.5">Welcome Back, Student!</h1>
            </div>
          </div>
          <p className="text-orange-100 text-xs mt-3 leading-relaxed">
            Access your hot meal passes, pause subscriptions during holidays, and discover hygienic messes near your college.
          </p>
        </div>

        <div className="p-6 sm:p-7">
          


          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email or Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Registered Email or Mobile Number
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. rahul.student@example.com or 9876543210"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => onOpenForgotPassword('CUSTOMER', identifier)}
                  className="text-[11px] font-bold text-orange-600 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Signing In...' : 'Sign In to Student Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Switch to Signup */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have a student account?{' '}
              <button
                type="button"
                onClick={onNavigateToSignup}
                className="font-extrabold text-orange-600 hover:underline"
              >
                Sign Up as Student
              </button>
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-400 mt-6">
        MessConnect Campus Dining System • Safe & Verified Mess Partnerships
      </div>

    </div>
  );
};
