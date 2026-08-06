'use client';

import type { ReactNode } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Optional decorative icon overriding the type-based glyph. Currently only
 * `'coin'`, used by the UGC-reward toast to render the brand `CoinIcon`
 * instead of the generic success checkmark. Kept as a serializable string
 * enum (not a `ReactNode`) so the toast object stays plain data.
 */
export type ToastIcon = 'coin';

export type ToastOptions = {
  icon?: ToastIcon;
  /**
   * Locale-relative path. When set, the toast becomes tappable and navigates
   * here on click (then dismisses) — used by the coin-reward toast to send the
   * author to `/mypage/coins`. A one-time discovery nudge, not a durable nav.
   */
  href?: string;
};

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  icon?: ToastIcon;
  href?: string;
};

type ToastContextValue = {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
  hideToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Monotonic id source.
 *
 * `Date.now()` used to fill this role and collided whenever two toasts were
 * raised in the same millisecond — the routine case for a single navigation
 * carrying several params (`?coinsEarned=3&coinsCapped=1`), which the
 * container consumes in one pass. Two toasts sharing an id duplicate a React
 * key, and every removal path filters by id, so dismissing (or auto-hiding)
 * either one silently took the other's message down with it.
 *
 * Module scope, not a ref: ids must not repeat across provider instances
 * either, and a counter is enough — nothing persists a toast id.
 */
let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerIdsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clean up all timers on unmount
  useEffect(() => {
    const timerIds = timerIdsRef.current;
    return () => {
      for (const timerId of timerIds.values()) {
        clearTimeout(timerId);
      }
      timerIds.clear();
    };
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', options?: ToastOptions) => {
      const id = (++nextToastId).toString();
      const newToast: Toast = {
        id,
        message,
        type,
        icon: options?.icon,
        href: options?.href,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        return updated;
      });

      // Auto-hide after 3 seconds
      const timerId = setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
        timerIdsRef.current.delete(id);
      }, 3000);
      timerIdsRef.current.set(id, timerId);
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    const timerId = timerIdsRef.current.get(id);
    if (timerId) {
      clearTimeout(timerId);
      timerIdsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => ({ toasts, showToast, hideToast }), [toasts, showToast, hideToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
