import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle, RefreshCw,
  GraduationCap, ChefHat, LogOut, User, Sparkles, MapPin
} from 'lucide-react';

export const MobileShell = ({
  children,
  onNavigateToStudentLogin,
  onNavigateToOwnerLogin,
  onBackToHome
}) => {
  const { currentUser, currentRole, isAuthenticated, logout } = useAuth();
  const { isOnline, loadMesses, userLocation } = useApp();

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col antialiased">
      
      {/* Universal Responsive Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          
          {/* Brand & Tagline */}
          <div
            onClick={onBackToHome}
            className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
          >
            <img
              src="/logo.jpeg"
              alt="MessConnect"
              className="w-8 h-8 rounded-xl object-contain shadow-sm group-hover:scale-105 transition"
            />
            <div>
              <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight block leading-tight">
                MessConnect
              </span>
              <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider hidden xs:block">
                Campus Dining & Subscription
              </span>
            </div>
          </div>

          {/* User Session & Role Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            
            {/* If Authenticated: show User Profile Pill & Sign Out */}
            {isAuthenticated && currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  onClick={() => window.dispatchEvent(new CustomEvent('messconnect:open-student-profile'))}
                  className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 hover:bg-orange-50 hover:border-orange-300 border border-slate-200 text-xs cursor-pointer transition select-none group"
                  title="Click to view & edit your student profile"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="font-semibold text-slate-700 group-hover:text-orange-600 transition">{currentUser.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white text-orange-700 border border-slate-200">
                    {currentRole === 'OWNER' ? 'Mess Owner' : currentRole === 'ADMIN' ? 'Admin' : 'Student'}
                  </span>
                  {currentUser.phone && (
                    <span className="text-[11px] text-slate-400">({currentUser.phone})</span>
                  )}
                  <span className="text-[10px] text-orange-600 font-bold ml-0.5 underline">Edit</span>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold text-xs border border-slate-200 hover:border-rose-200 transition"
                  title="Sign Out of Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              /* If Unauthenticated: show portal buttons */
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={onNavigateToStudentLogin}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Student Sign In</span>
                </button>

                <button
                  onClick={onNavigateToOwnerLogin}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                >
                  <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Owner</span>
                  <span>Portal</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Real Offline Alert Banner (Only when actual network is disconnected) */}
      {!isOnline && (
        <div className="w-full bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs z-30">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Offline Cache Active • Browsing stored mess menus from local IndexedDB</span>
            </div>
            <button
              onClick={loadMesses}
              className="p-1 hover:bg-amber-600/30 rounded-lg transition"
              title="Retry connecting"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Complete Responsive Web Viewport (No mobile bezel simulator!) */}
      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>

    </div>
  );
};

export const WebShell = MobileShell;
