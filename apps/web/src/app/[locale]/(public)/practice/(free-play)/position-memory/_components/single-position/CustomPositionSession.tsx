'use client';

import { useCallback, useRef } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { buildCustomResultUrl } from '../../_lib/result-url';
import type { DisplayMode } from '../../_lib/session-config';
import type { PositionData } from '../../_lib/types';
import {
  PositionMemorySessionView,
  type SessionCompletePayload,
} from '../session/PositionMemorySessionView';
import { SinglePositionResultSkeleton } from './SinglePositionResultSkeleton';

type Props = {
  locale: Locale;
  /** Base64URL FEN token, used only to build the result/"try again" URL. */
  token: string;
  timeLimit: number;
  displayMode?: DisplayMode;
  position: PositionData;
  /**
   * Skip the memorize phase and start on the empty recreate board. Set by the
   * in-game position check, where the "memorizing" already happened during
   * play — the point is to test the picture the player carries in their head,
   * not to show them the answer first.
   */
  skipMemorize?: boolean;
  /**
   * Validated same-origin path threaded into the result URL, so the result
   * screen can offer a "back to game" action (and preserve it across "try
   * again"). Set together with `skipMemorize` by the in-game entry.
   */
  returnTo?: string;
};

/**
 * Session wrapper for an instant ("custom") single position whose FEN is
 * encoded in the URL rather than stored in the database.
 *
 * Same single-position UX as {@link SinglePositionSession} (pause/resume,
 * skip-as-quit, no inter-problem result screen) but deliberately does NOT call
 * `savePositionMemoryResult`: instant problems are not authored, persisted, or
 * EXP-eligible — there is nothing to write. Completion just serializes the run
 * into the custom result URL.
 */
export function CustomPositionSession({
  locale,
  token,
  timeLimit,
  displayMode = 'board',
  position,
  skipMemorize = false,
  returnTo,
}: Props) {
  const router = useRouter();
  const savedRef = useRef(false);

  const handleSessionComplete = useCallback(
    ({ results, stats }: SessionCompletePayload) => {
      // Guard against double-invocation (StrictMode re-mount, fast rerenders).
      if (savedRef.current) return;
      savedRef.current = true;

      router.push(
        buildCustomResultUrl({ locale, token, timeLimit, results, stats, skipMemorize, returnTo })
      );
    },
    [locale, token, timeLimit, skipMemorize, returnTo, router]
  );

  return (
    <PositionMemorySessionView
      timeLimit={timeLimit}
      shuffle={false}
      presetPositions={[position]}
      skipMemorize={skipMemorize}
      displayMode={displayMode}
      behavior={{
        enablePause: true,
        skipBehavesAsQuit: true,
        showSkipButton: false,
        skipProblemResult: true,
      }}
      onSessionComplete={handleSessionComplete}
      // Custom positions are not EXP-eligible, so reserve no EXP card — but
      // still match the bespoke board-comparison result skeleton (with the
      // sign-up banner for guests) instead of the generic leaderboard one.
      finishFallback={<SinglePositionResultSkeleton />}
    />
  );
}
