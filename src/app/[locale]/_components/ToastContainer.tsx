'use client';

import { useEffect, useRef } from 'react';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

import { useToast } from '../_contexts/ToastContext';

export function ToastContainer() {
  const { toasts, hideToast, showToast } = useToast();
  const t = useTranslations('home');
  const pathname = usePathname();
  const processingToastRef = useRef(false);

  // Handle global notifications that need to be shown across page transitions
  useEffect(() => {
    const checkForToast = () => {
      // Prevent duplicate processing
      if (processingToastRef.current) return;

      const shouldShowSaveToast = sessionStorage.getItem('blindfold_chess_show_save_toast');

      if (shouldShowSaveToast === 'true') {
        processingToastRef.current = true;
        sessionStorage.removeItem('blindfold_chess_show_save_toast');
        showToast(t('gameSavedToast'), 'success');

        // Reset flag after a delay
        setTimeout(() => {
          processingToastRef.current = false;
        }, 1000);
      }
    };

    // Check when pathname changes (navigation occurred)
    checkForToast();
  }, [pathname, showToast]); // Re-run when pathname changes

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-sm mx-auto space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
        ))}
      </div>
    </div>
  );
}

interface ToastProps {
  toast: { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' };
  onClose: () => void;
}

function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-600 dark:bg-green-500 text-white';
      case 'error':
        return 'bg-red-600 dark:bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 dark:bg-yellow-400 text-white dark:text-gray-900';
      default:
        return 'bg-gray-800 dark:bg-gray-700 text-white';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  return (
    <div
      className={`${getStyles()} px-4 py-3 rounded-lg shadow-lg pointer-events-auto transform transition-all duration-300 ease-out`}
      onClick={onClose}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{getIcon()}</span>
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
      </div>
    </div>
  );
}
