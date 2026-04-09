'use client';

import { useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';

import * as Sentry from '@sentry/nextjs';

import type { ExpInfo } from '@/lib/exp-types';

import { SESSION_STORAGE_KEYS } from '@/app/[locale]/(public)/practice/_lib/session-storage-keys';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

type SaveResultResponse = {
  success: boolean;
  error?: string;
  grantedRanks?: { slug: string }[];
  exp?: ExpInfo;
};

type UseChallengeResultSaveOptions = {
  isFinished: boolean;
  totalAnswers: number;
  resultUrl: string;
  saveResult: () => Promise<SaveResultResponse>;
  moduleName: string;
};

/**
 * Shared hook for challenge completion: saves result, stores granted ranks
 * in sessionStorage, and redirects to the result page.
 * Prevents double-saving via a ref guard.
 * Skips save for unauthenticated users (redirects directly to result page).
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
      saveResult()
        .then((result) => {
          if (!result.success) {
            console.error(`Failed to save ${moduleName} result:`, result.error);
            sessionStorage.setItem(SESSION_STORAGE_KEYS.SHOW_SAVE_ERROR_TOAST, 'true');
          } else if (result.grantedRanks && result.grantedRanks.length > 0) {
            sessionStorage.setItem(
              SESSION_STORAGE_KEYS.GRANTED_RANKS,
              JSON.stringify(result.grantedRanks)
            );
          }
          if (result.exp) {
            sessionStorage.setItem(SESSION_STORAGE_KEYS.EXP_RESULT, JSON.stringify(result.exp));
          }
        })
        .catch((error) => {
          console.error(`Failed to save ${moduleName} result:`, error);
          Sentry.captureException(error);
          sessionStorage.setItem(SESSION_STORAGE_KEYS.SHOW_SAVE_ERROR_TOAST, 'true');
        })
        .finally(() => {
          router.push(resultUrl);
        });
    } else {
      router.push(resultUrl);
    }
  }, [isFinished, totalAnswers, resultUrl, saveResult, moduleName, router, user, isLoading]);
}
