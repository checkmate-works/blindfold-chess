'use client';

import { useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';

import * as Sentry from '@sentry/nextjs';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

type SaveResultResponse = {
  success: boolean;
  error?: string;
  grantedRanks?: { slug: string }[];
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
            sessionStorage.setItem('blindfold_chess_show_practice_save_error_toast', 'true');
          } else if (result.grantedRanks && result.grantedRanks.length > 0) {
            sessionStorage.setItem(
              'blindfold_chess_granted_ranks',
              JSON.stringify(result.grantedRanks)
            );
          }
        })
        .catch((error) => {
          console.error(`Failed to save ${moduleName} result:`, error);
          Sentry.captureException(error);
          sessionStorage.setItem('blindfold_chess_show_practice_save_error_toast', 'true');
        })
        .finally(() => {
          router.push(resultUrl);
        });
    } else {
      router.push(resultUrl);
    }
  }, [isFinished, totalAnswers, resultUrl, saveResult, moduleName, router, user, isLoading]);
}
