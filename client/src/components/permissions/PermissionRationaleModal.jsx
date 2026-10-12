import React from 'react';
import { MapPin, Bell, Shield, X, Check } from 'lucide-react';

export const PermissionRationaleModal = ({
  isOpen,
  type = 'location', // 'location' or 'notification'
  onAccept,
  onDeny,
  onManualFallback
}) => {
  if (!isOpen) return null;

  const isLocation = type === 'location';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4">
          {isLocation ? <MapPin className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
        </div>

        <h3 className="text-xl font-bold text-center text-slate-900 mb-2">
          {isLocation ? 'Find Messes Near You' : 'Stay Updated with Meals'}
        </h3>

        <p className="text-xs text-slate-600 text-center leading-relaxed mb-6">
          {isLocation
            ? 'MessConnect uses your location only to show messes within walking distance. We never continuously track you in the background.'
            : 'Get timely alerts for 8:00 AM breakfast, daily special menus, and subscription expiry warnings so you never miss a meal.'}
        </p>

        <div className="space-y-2.5">
          <button
            onClick={onAccept}
            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-2xl transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isLocation ? 'Allow Location Access' : 'Enable Notifications'}
          </button>

          {isLocation && onManualFallback && (
            <button
              onClick={onManualFallback}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-2xl transition"
            >
              Enter Area Manually
            </button>
          )}

          <button
            onClick={onDeny}
            className="w-full py-2.5 px-4 text-xs font-medium text-slate-500 hover:text-slate-800 transition text-center"
          >
            Not Now
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Minimum Permission Principle • No spam</span>
        </div>
      </div>
    </div>
  );
};
