'use client';

import { useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';

import * as Sentry from '@sentry/nextjs';

import type { GrantedRank } from '@/lib/db/data/ranks';

import { stashGrantedRanks } from '@/app/[locale]/(public)/practice/_lib/granted-ranks-stash';
import { SESSION_STORAGE_KEYS } from '@/app/[locale]/(public)/practice/_lib/session-storage-keys';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

type SaveResultResponse = {
  success: boolean;
  error?: string;
  grantedRanks?: GrantedRank[];
  challengeResultId?: string;
};

type UseChallengeResultSaveOptions = {
  isFinished: boolean;
  totalAnswers: number;
  resultUrl: string;
  saveResult: () => Promise<SaveResultResponse>;
  moduleName: string;
  /**
   * When `true`, the result is NOT persisted — no leaderboard record, no EXP
   * grant, no rank evaluation — and the hook redirects straight to the result
   * page. Used by the "quit" flow so an aborted run still shows the same
   * feedback screen without rewarding a partial, voluntarily-abandoned run.
   */
  skipSave?: boolean;
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
  skipSave = false,
}: UseChallengeResultSaveOptions) {
  const router = useRouter();
  const savedRef = useRef(false);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isFinished || savedRef.current) return;
    // Auth state only matters when we might persist; an aborted run redirects
    // immediately without waiting for it to resolve.
    if (!skipSave && isLoading) return;
    savedRef.current = true;

    if (!skipSave && totalAnswers > 0 && user) {
      let redirectUrl = resultUrl;
      saveResult()
        .then((result) => {
          if (!result.success) {
            console.error(`Failed to save ${moduleName} result:`, result.error);
            sessionStorage.setItem(SESSION_STORAGE_KEYS.SHOW_SAVE_ERROR_TOAST, 'true');
            return;
          }
          stashGrantedRanks(result.grantedRanks);
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
  }, [
    isFinished,
    totalAnswers,
    resultUrl,
    saveResult,
    moduleName,
    router,
    user,
    isLoading,
    skipSave,
  ]);
}
