'use client';

import { useCallback, useRef } from 'react';

import { useRouter } from 'next/navigation';

import * as Sentry from '@sentry/nextjs';

import type { Locale } from '@/app/[locale]/_lib/types';

import { savePositionMemoryResult } from '../../_actions/save-result';
import { buildSingleResultUrl } from '../../_lib/result-url';
import type { DisplayMode } from '../../_lib/session-config';
import type { PositionData } from '../../_lib/types';
import { SinglePositionResultSkeleton } from '../single-position/SinglePositionResultSkeleton';
import {
  PositionMemorySessionView,
  type SessionCompletePayload,
} from './PositionMemorySessionView';

/**
 * Append `?grant=<id>` (or `&grant=<id>` if the URL already has a query) so
 * the result page can refetch the granted EXP server-side.
 */
function appendGrantParam(url: string, expEventId: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}grant=${encodeURIComponent(expEventId)}`;
}

type Props = {
  locale: Locale;
  positionId: string;
  timeLimit: number;
  displayMode?: DisplayMode;
  position: PositionData;
};

/**
 * Session wrapper for a DB-backed single position.
 *
 * Fixes the session-view flags that distinguish the single-position flavor:
 * pause/resume enabled, the skip button doubles as quit, the inter-problem
 * result page is skipped, and completion redirects to the per-position
 * result route.
 */
export function SinglePositionSession({
  locale,
  positionId,
  timeLimit,
  displayMode = 'board',
  position,
}: Props) {
  const router = useRouter();
  const savedRef = useRef(false);

  const handleSessionComplete = useCallback(
    ({ results, stats }: SessionCompletePayload) => {
      // Guard against double-invocation (StrictMode re-mount, fast rerenders).
      // Must NOT call router.push here — the first call's promise chain owns
      // navigation. Matches the pattern in `useChallengeResultSave`.
      if (savedRef.current) return;
      savedRef.current = true;

      // `correctCount` is the total correct pieces from the submitted accuracy,
      // `mistakes` is the running tally of piece-level errors across the
      // session (see PositionMemoryContext.totalMistakes in `_lib/machines/types.ts`:
      // `incorrectPieces + missingPieces + extraPieces`, summed across submits).
      const correctCount = stats?.c ?? 0;
      const mistakes = stats?.k ?? 0;

      const baseUrl = buildSingleResultUrl({
        locale,
        positionId,
        timeLimit,
        results,
        stats,
      });

      savePositionMemoryResult({
        correctCount,
        mistakes,
        // DB-backed single-position runs are never custom-FEN.
        isCustomFen: false,
      })
        .then((result) => {
          if (result.success && result.expEventId) {
            router.push(appendGrantParam(baseUrl, result.expEventId));
            return;
          }
          router.push(baseUrl);
        })
        .catch((error) => {
          Sentry.captureException(error);
          router.push(baseUrl);
        });
    },
    [locale, positionId, timeLimit, router]
  );

  return (
    <PositionMemorySessionView
      timeLimit={timeLimit}
      shuffle={false}
      presetPositions={[position]}
      displayMode={displayMode}
      behavior={{
        enablePause: true,
        skipBehavesAsQuit: true,
        showSkipButton: false,
        skipProblemResult: true,
      }}
      onSessionComplete={handleSessionComplete}
      // DB-backed single positions earn EXP; match the bespoke result skeleton
      // shape (board comparison) during the save + redirect window.
      finishFallback={<SinglePositionResultSkeleton grantsExp />}
    />
  );
}
