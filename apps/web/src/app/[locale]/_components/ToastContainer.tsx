'use client';

import { useEffect, useRef } from 'react';

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { SESSION_STORAGE_KEYS as GAME_SESSION_STORAGE_KEYS } from '@/app/[locale]/(public)/games/play/_lib/session-storage-keys';
import { SESSION_STORAGE_KEYS as PRACTICE_SESSION_STORAGE_KEYS } from '@/app/[locale]/(public)/practice/_lib/session-storage-keys';
import { UI_TIMEOUTS } from '@/app/[locale]/_constants/ui-timeouts';
import type { ToastType } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useToast } from '../_contexts/ToastContext';
import { ToastItem } from './ToastItem';

const TOAST_PARAM_CONFIG: Record<string, { messageKey: string; type: ToastType }> = {
  login_success: { messageKey: 'loginSuccess', type: 'success' },
  logout_success: { messageKey: 'logoutSuccess', type: 'success' },
  already_logged_in: { messageKey: 'alreadyLoggedIn', type: 'info' },
  sign_in_required: { messageKey: 'signInRequired', type: 'info' },
  profile_updated: { messageKey: 'profileUpdated', type: 'success' },
  post_created: { messageKey: 'postCreated', type: 'success' },
  game_published: { messageKey: 'gamePublished', type: 'success' },
  game_claimed: { messageKey: 'gameClaimed', type: 'success' },
  rate_limited: { messageKey: 'rateLimited', type: 'info' },
  account_deleted: { messageKey: 'accountDeleted', type: 'success' },
  position_created: { messageKey: 'positionCreated', type: 'success' },
  position_deleted: { messageKey: 'positionDeleted', type: 'success' },
  line_updated: { messageKey: 'lineUpdated', type: 'success' },
  line_added: { messageKey: 'lineAdded', type: 'success' },
  position_updated: { messageKey: 'positionUpdated', type: 'success' },
  puzzle_updated: { messageKey: 'puzzleUpdated', type: 'success' },
  puzzle_deleted: { messageKey: 'puzzleDeleted', type: 'success' },
  edit_request_submitted: { messageKey: 'editRequestSubmitted', type: 'success' },
  edit_request_accepted: { messageKey: 'editRequestAccepted', type: 'success' },
  edit_request_rejected: { messageKey: 'editRequestRejected', type: 'success' },
};

type ToastContainerProps = {
  /**
   * Locale used for locale-prefixed navigation. Supplied by the landing (`/`)
   * route, whose URL has no `[locale]` segment for `useParams` to read.
   * Under `[locale]/`, omit it — the route segment is used instead.
   */
  locale?: string;
};

export function ToastContainer({ locale: localeProp }: ToastContainerProps = {}) {
  const { toasts, hideToast, showToast } = useToast();
  const tToast = useTranslations('toast');
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = localeProp ?? (params.locale as Locale);
  const processingToastRef = useRef(false);

  // Handle toast query parameters (from server-side redirects / post-create
  // navigations). Three shapes are supported:
  //   ?toast=<key>        — fixed message keyed by TOAST_PARAM_CONFIG
  //   ?coinsEarned=<n>    — UGC-reward toast rendered with the brand CoinIcon
  //   ?coinsCapped=1      — daily-cap warning ("today's coin limit reached")
  // All are consumed and stripped from the URL in a single history-neutral
  // replace so the reward isn't re-shown on refresh or back-navigation.
  useEffect(() => {
    const toastParam = searchParams.get('toast');
    const coinsParam = searchParams.get('coinsEarned');
    const cappedParam = searchParams.get('coinsCapped');
    if (!toastParam && !coinsParam && !cappedParam) return;

    let handled = false;

    if (toastParam) {
      const config = TOAST_PARAM_CONFIG[toastParam];
      if (config) {
        showToast(tToast(config.messageKey), config.type);
        handled = true;
      }
    }

    if (coinsParam) {
      const count = Number.parseInt(coinsParam, 10);
      if (Number.isFinite(count) && count > 0) {
        showToast(tToast('coinsEarned', { count }), 'success', { icon: 'coin' });
        handled = true;
      }
    }

    if (cappedParam === '1') {
      showToast(tToast('coinsDailyCap'), 'warning');
      handled = true;
    }

    if (!handled) return;

    // Strip the consumed params from the URL without adding a history entry.
    const url = new URL(window.location.href);
    url.searchParams.delete('toast');
    url.searchParams.delete('coinsEarned');
    url.searchParams.delete('coinsCapped');
    router.replace(url.pathname + url.search, { scroll: false });
  }, [searchParams, showToast, tToast, router]);

  // Handle global notifications that need to be shown across page transitions
  useEffect(() => {
    const checkForToast = () => {
      // Prevent duplicate processing
      if (processingToastRef.current) return;

      const shouldShowPracticeErrorToast = sessionStorage.getItem(
        PRACTICE_SESSION_STORAGE_KEYS.SHOW_SAVE_ERROR_TOAST
      );
      const shouldShowSaveToast = sessionStorage.getItem(GAME_SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST);
      const shouldShowDeleteToast = sessionStorage.getItem(
        GAME_SESSION_STORAGE_KEYS.SHOW_DELETE_TOAST
      );

      if (shouldShowPracticeErrorToast === 'true') {
        processingToastRef.current = true;
        sessionStorage.removeItem(PRACTICE_SESSION_STORAGE_KEYS.SHOW_SAVE_ERROR_TOAST);
        showToast(tToast('practiceResultSaveFailed'), 'error');

        setTimeout(() => {
          processingToastRef.current = false;
        }, 1000);
      } else if (shouldShowSaveToast === 'true') {
        processingToastRef.current = true;
        sessionStorage.removeItem(GAME_SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST);
        showToast(tToast('gameSaved'), 'success');

        // Reset flag after a delay
        setTimeout(() => {
          processingToastRef.current = false;
        }, 1000);
      } else if (shouldShowDeleteToast === 'true') {
        processingToastRef.current = true;
        const deletedCount = sessionStorage.getItem(GAME_SESSION_STORAGE_KEYS.DELETED_COUNT);
        sessionStorage.removeItem(GAME_SESSION_STORAGE_KEYS.SHOW_DELETE_TOAST);
        sessionStorage.removeItem(GAME_SESSION_STORAGE_KEYS.DELETED_COUNT);

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
    <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-sm mx-auto space-y-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => hideToast(toast.id)}
            duration={UI_TIMEOUTS.TOAST_DURATION}
          />
        ))}
      </div>
    </div>
  );
}
