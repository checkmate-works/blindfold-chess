'use client';

import { useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';

import * as Sentry from '@sentry/nextjs';

import { SESSION_STORAGE_KEYS } from '@/app/[locale]/(public)/practice/_lib/session-storage-keys';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

type SaveResultResponse = {
  success: boolean;
  error?: string;
  grantedRanks?: { slug: string }[];
  challengeResultId?: string;
};

type UseChallengeResultSaveOptions = {
  isFinished: boolean;
  totalAnswers: number;
  resultUrl: string;
  saveResult: () => Promise<SaveResultResponse>;
  moduleName: string;
};

/**
 * Appends `?grant=<id>` (or `&grant=<id>` if the URL already has a query) to
 * the given URL so the result page can refetch the granted EXP server-side.
 */
function appendGrantParam(url: string, challengeResultId: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}grant=${encodeURIComponent(challengeResultId)}`;
}

/**
 * Shared hook for challenge completion: saves result, stores granted ranks
 * in sessionStorage, and redirects to the result page.
 * Prevents double-saving via a ref guard.
 * Skips save for unauthenticated users (redirects directly to result page).
 *
 * On successful save, appends `?grant=<challengeResultId>` to the redirect
 * URL so the result page Server Component can refetch the granted EXP and
 * render it via `ExpGainDisplay` — this replaces the previous sessionStorage
 * handoff and works correctly on reload / direct access.
 */
export function useChallengeResultSave({
  isFinished,
  totalAnswers,
  resultUrl,
  saveResult,
  moduleName,
}: UseChallengeResultSaveOptions) {
  const router = useRouter();
  const savedRef = useRef(false);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isFinished || savedRef.current || isLoading) return;
    savedRef.current = true;

    if (totalAnswers > 0 && user) {
      let redirectUrl = resultUrl;
      saveResult()
        .then((result) => {
          if (!result.success) {
            console.error(`Failed to save ${moduleName} result:`, result.error);
            sessionStorage.setItem(SESSION_STORAGE_KEYS.SHOW_SAVE_ERROR_TOAST, 'true');
            return;
          }
          if (result.grantedRanks && result.grantedRanks.length > 0) {
            sessionStorage.setItem(
              SESSION_STORAGE_KEYS.GRANTED_RANKS,
              JSON.stringify(result.grantedRanks)
            );
          }
          if (result.challengeResultId) {
            redirectUrl = appendGrantParam(resultUrl, result.challengeResultId);
          }
        })
        .catch((error) => {
          console.error(`Failed to save ${moduleName} result:`, error);
          Sentry.captureException(error);
          sessionStorage.setItem(SESSION_STORAGE_KEYS.SHOW_SAVE_ERROR_TOAST, 'true');
        })
        .finally(() => {
          router.push(redirectUrl);
        });
    } else {
      router.push(resultUrl);
    }
  }, [isFinished, totalAnswers, resultUrl, saveResult, moduleName, router, user, isLoading]);
}
