'use client';

import type { KeyboardEvent } from 'react';
import { useEffect } from 'react';

import { useRouter } from '@/i18n/routing';
import { CoinIcon } from '@blindfold-chess/icons';

import type { ToastIcon, ToastType } from '@/app/[locale]/_contexts/ToastContext';

type ToastData = {
  id: string;
  message: string;
  type: ToastType;
  icon?: ToastIcon;
  href?: string;
};

type Props = {
  toast: ToastData;
  onClose: () => void;
  duration: number;
};

export function ToastItem({ toast, onClose, duration }: Props) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  // A toast with an `href` acts as a shortcut: tapping navigates there and
  // dismisses. Without one it just dismisses (the pre-existing behavior).
  const handleClick = () => {
    if (toast.href) router.push(toast.href);
    onClose();
  };

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

  const isLink = Boolean(toast.href);

  return (
    <div
      className={`${getStyles()} px-4 py-3 rounded-md pointer-events-auto transform transition-all duration-300 ease-out ${
        isLink ? 'cursor-pointer' : ''
      }`}
      onClick={handleClick}
      {...(isLink
        ? {
            role: 'link',
            tabIndex: 0,
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            },
          }
        : {})}
    >
      <div className="flex items-center gap-3">
        {toast.icon === 'coin' ? (
          <CoinIcon size={20} aria-hidden="true" />
        ) : (
          <span className="text-lg">{getIcon()}</span>
        )}
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        {isLink && (
          <span className="text-lg shrink-0" aria-hidden="true">
            {'→'}
          </span>
        )}
      </div>
    </div>
  );
}
