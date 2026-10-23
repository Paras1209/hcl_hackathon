import React from 'react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'warning', // 'warning' | 'danger' | 'info' | 'success'
  onConfirm,
  onCancel,
  children,
  loading = false,
}) {
  if (!isOpen) return null;

  const typeConfig = {
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
      btnColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-rose-600 bg-rose-50 border-rose-200',
      btnColor: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
      btnColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    success: {
      icon: CheckCircle2,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  };

  const config = typeConfig[type] || typeConfig.warning;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all scale-100">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border shrink-0 ${config.iconColor}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <button
                  onClick={onCancel}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</p>
              {children && <div className="mt-4">{children}</div>}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 ${config.btnColor}`}
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
