import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export const ToastContainer = ({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: string) => void }) => {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const styles = {
    success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> },
    error:   { bg: 'bg-red-50 border-red-200',         text: 'text-red-800',     icon: <AlertCircle   className="w-4 h-4 text-red-500 shrink-0" /> },
    info:    { bg: 'bg-blue-50 border-blue-200',        text: 'text-blue-800',    icon: <Info          className="w-4 h-4 text-blue-500 shrink-0" /> },
  }[toast.type];

  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm text-sm font-medium animate-in slide-in-from-bottom-2 fade-in duration-200 ${styles.bg} ${styles.text}`}>
      {styles.icon}
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="opacity-50 hover:opacity-100 transition-opacity ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
