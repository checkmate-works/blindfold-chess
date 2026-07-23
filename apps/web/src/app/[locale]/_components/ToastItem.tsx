'use client';

import { useEffect } from 'react';

import { CoinIcon } from '@blindfold-chess/icons';

import type { ToastIcon, ToastType } from '@/app/[locale]/_contexts/ToastContext';

type ToastData = {
  id: string;
  message: string;
  type: ToastType;
  icon?: ToastIcon;
};

type Props = {
  toast: ToastData;
  onClose: () => void;
  duration: number;
};

export function ToastItem({ toast, onClose, duration }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

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
      className={`${getStyles()} px-4 py-3 rounded-md pointer-events-auto transform transition-all duration-300 ease-out`}
      onClick={onClose}
    >
      <div className="flex items-center gap-3">
        {toast.icon === 'coin' ? (
          <CoinIcon size={20} aria-hidden="true" />
        ) : (
          <span className="text-lg">{getIcon()}</span>
        )}
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
      </div>
    </div>
  );
}
