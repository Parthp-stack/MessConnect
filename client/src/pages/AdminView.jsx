import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { Shield, Lock, LogOut, Mail } from 'lucide-react';

export const AdminView = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      <header className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200/80 shrink-0 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-slate-900 text-sm tracking-tight">MessConnect SuperAdmin</h2>
                <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Lock className="w-2.5 h-2.5 text-emerald-600" /> Authorized
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {currentUser?.name || 'Parth'} {currentUser?.phone ? `(${currentUser.phone})` : '• +91 94234 90513'} • {currentUser?.department || 'Platform Administration & Support Lead'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold text-xs border border-slate-200 hover:border-rose-200 transition"
              title="Sign Out of SuperAdmin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 pb-24">
        <AdminDashboard />
      </main>
    </div>
  );
};
