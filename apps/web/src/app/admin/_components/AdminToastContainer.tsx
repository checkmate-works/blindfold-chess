'use client';

import { ToastItem } from '@/app/[locale]/_components/ToastItem';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

const ADMIN_TOAST_DURATION = 5000;

export function AdminToastContainer() {
  const { toasts, hideToast } = useToast();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-sm mx-auto space-y-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => hideToast(toast.id)}
            duration={ADMIN_TOAST_DURATION}
          />
        ))}
      </div>
    </div>
  );
}
