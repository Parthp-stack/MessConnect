import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import { CheckCircle2, AlertCircle, Info, Bell, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts } = useNotification();

  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      default: return <Bell className="w-5 h-5 text-indigo-400 shrink-0" />;
    }
  };

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-start gap-3 animate-in fade-in slide-in-from-top duration-200"
        >
          {getIcon(toast.type)}
          <div className="flex-1 text-xs">
            {toast.title && <div className="font-semibold text-slate-100 text-sm mb-0.5">{toast.title}</div>}
            <div className="text-slate-300 leading-relaxed">{toast.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
