'use client';

import { useEffect } from 'react';

import type { ToastType } from '@/app/[locale]/_contexts/ToastContext';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

export function AdminToastContainer() {
  const { toasts, hideToast } = useToast();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-sm mx-auto space-y-2">
        {toasts.map((toast) => (
          <AdminToast key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
        ))}
      </div>
    </div>
  );
}

type Props = {
  toast: { id: string; message: string; type: ToastType };
  onClose: () => void;
};

function AdminToast({ toast, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-success text-success-foreground';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      case 'warning':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '\u2713';
      case 'error':
        return '\u2715';
      case 'warning':
        return '\u26A0';
      default:
        return '\u2139';
    }
  };

  return (
    <div
      className={`${getStyles()} px-4 py-3 rounded-md shadow-lg pointer-events-auto transform transition-all duration-300 ease-out`}
      onClick={onClose}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{getIcon()}</span>
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
      </div>
    </div>
  );
}
