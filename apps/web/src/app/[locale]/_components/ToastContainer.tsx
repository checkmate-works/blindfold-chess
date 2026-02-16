'use client';

import { useEffect, useRef } from 'react';

import { useTranslations } from 'next-intl';
import { useParams, usePathname, useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { useToast } from '../_contexts/ToastContext';

export function ToastContainer() {
  const { toasts, hideToast, showToast } = useToast();
  const t = useTranslations('home');
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = params.locale as Locale;
  const processingToastRef = useRef(false);

  // Handle global notifications that need to be shown across page transitions
  useEffect(() => {
    const checkForToast = () => {
      // Prevent duplicate processing
      if (processingToastRef.current) return;

      // Check for game limit error first (higher priority)
      const gameLimitReached = sessionStorage.getItem('blindfold_chess_game_limit_reached');
      const hasPendingGame = sessionStorage.getItem('blindfold_chess_pending_game');

      if (gameLimitReached === 'true' && hasPendingGame) {
        // Redirect to limit-reached page instead of showing toast
        processingToastRef.current = true;
        router.push(`/${locale}/games/limit-reached`);

        // Reset flag after redirect
        setTimeout(() => {
          processingToastRef.current = false;
        }, 1000);
        return;
      }

      const shouldShowSaveToast = sessionStorage.getItem('blindfold_chess_show_save_toast');
      const shouldShowDeleteToast = sessionStorage.getItem('blindfold_chess_show_delete_toast');

      if (shouldShowSaveToast === 'true') {
        processingToastRef.current = true;
        sessionStorage.removeItem('blindfold_chess_show_save_toast');
        showToast(t('gameSavedToast'), 'success');

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
        showToast(t('gamesDeletedToast', { count }), 'success');

        // Reset flag after a delay
        setTimeout(() => {
          processingToastRef.current = false;
        }, 1000);
      }
    };

    const handleGameLimitReached = () => {
      // Immediate redirect for game limit
      if (processingToastRef.current) return;

      const gameLimitReached = sessionStorage.getItem('blindfold_chess_game_limit_reached');
      if (gameLimitReached === 'true') {
        processingToastRef.current = true;
        router.push(`/${locale}/games/limit-reached`);

        // Reset flag after redirect
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
    window.addEventListener('blindfold-chess:game-limit-reached', handleGameLimitReached);
    window.addEventListener('blindfold-chess:game-limit-start-error', handleGameLimitStartError);

    return () => {
      window.removeEventListener('blindfold-chess:game-limit-reached', handleGameLimitReached);
      window.removeEventListener(
        'blindfold-chess:game-limit-start-error',
        handleGameLimitStartError
      );
    };
  }, [pathname, showToast, t, router, locale]); // Re-run when pathname changes

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

type Props = {
  toast: { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' };
  onClose: () => void;
};

function Toast({ toast, onClose }: Props) {
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
