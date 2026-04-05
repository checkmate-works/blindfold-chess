'use client';

import { useEffect, useRef } from 'react';

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { UI_TIMEOUTS } from '@/app/[locale]/_constants/ui-timeouts';
import type { ToastType } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useToast } from '../_contexts/ToastContext';

const TOAST_PARAM_CONFIG: Record<string, { messageKey: string; type: ToastType }> = {
  login_success: { messageKey: 'loginSuccess', type: 'success' },
  logout_success: { messageKey: 'logoutSuccess', type: 'success' },
  already_logged_in: { messageKey: 'alreadyLoggedIn', type: 'info' },
  sign_in_required: { messageKey: 'signInRequired', type: 'info' },
  profile_updated: { messageKey: 'profileUpdated', type: 'success' },
  post_created: { messageKey: 'postCreated', type: 'success' },
  rate_limited: { messageKey: 'rateLimited', type: 'info' },
  account_deleted: { messageKey: 'accountDeleted', type: 'success' },
};

export function ToastContainer() {
  const { toasts, hideToast, showToast } = useToast();
  const tToast = useTranslations('toast');
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = params.locale as Locale;
  const processingToastRef = useRef(false);

  // Handle toast query parameter (from server-side redirects)
  useEffect(() => {
    const toastParam = searchParams.get('toast');
    if (!toastParam) return;

    const config = TOAST_PARAM_CONFIG[toastParam];
    if (!config) return;

    showToast(tToast(config.messageKey), config.type);

    // Clean up the toast query parameter from the URL without adding a history entry
    const url = new URL(window.location.href);
    url.searchParams.delete('toast');
    router.replace(url.pathname + url.search, { scroll: false });
  }, [searchParams, showToast, tToast, router]);

  // Handle global notifications that need to be shown across page transitions
  useEffect(() => {
    const checkForToast = () => {
      // Prevent duplicate processing
      if (processingToastRef.current) return;

      const shouldShowPracticeErrorToast = sessionStorage.getItem(
        'blindfold_chess_show_practice_save_error_toast'
      );
      const shouldShowSaveToast = sessionStorage.getItem('blindfold_chess_show_save_toast');
      const shouldShowDeleteToast = sessionStorage.getItem('blindfold_chess_show_delete_toast');

      if (shouldShowPracticeErrorToast === 'true') {
        processingToastRef.current = true;
        sessionStorage.removeItem('blindfold_chess_show_practice_save_error_toast');
        showToast(tToast('practiceResultSaveFailed'), 'error');

        setTimeout(() => {
          processingToastRef.current = false;
        }, 1000);
      } else if (shouldShowSaveToast === 'true') {
        processingToastRef.current = true;
        sessionStorage.removeItem('blindfold_chess_show_save_toast');
        showToast(tToast('gameSaved'), 'success');

        // Reset flag after a delay
        setTimeout(() => {
          processingToastRef.current = false;
        }, 1000);
      } else if (shouldShowDeleteToast === 'true') {
        processingToastRef.current = true;
        const deletedCount = sessionStorage.getItem('blindfold_chess_deleted_count');
        sessionStorage.removeItem('blindfold_chess_show_delete_toast');
        sessionStorage.removeItem('blindfold_chess_deleted_count');

        const count = deletedCount ? parseInt(deletedCount, 10) : 1;
        showToast(tToast('gamesDeleted', { count }), 'success');

        // Reset flag after a delay
        setTimeout(() => {
          processingToastRef.current = false;
        }, 1000);
      }
    };

    const handleGameLimitStartError = () => {
      if (processingToastRef.current) return;
      processingToastRef.current = true;
      router.push(`/${locale}/games/new`);
      setTimeout(() => {
        processingToastRef.current = false;
      }, 1000);
    };

    // Check when pathname changes (navigation occurred)
    checkForToast();

    // Listen for custom event
    window.addEventListener('blindfold-chess:game-limit-start-error', handleGameLimitStartError);

    return () => {
      window.removeEventListener(
        'blindfold-chess:game-limit-start-error',
        handleGameLimitStartError
      );
    };
  }, [pathname, showToast, tToast, router, locale]); // Re-run when pathname changes

  return (
    <div className="fixed bottom-20 md:bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-sm mx-auto space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
        ))}
      </div>
    </div>
  );
}

type Props = {
  toast: { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' };
  onClose: () => void;
};

function Toast({ toast, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, UI_TIMEOUTS.TOAST_DURATION);
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
