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

type Props = {
  locale: Locale;
  /** Base64URL FEN token, used only to build the result/"try again" URL. */
  token: string;
  timeLimit: number;
  displayMode?: DisplayMode;
  position: PositionData;
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
}: Props) {
  const router = useRouter();
  const savedRef = useRef(false);

  const handleSessionComplete = useCallback(
    ({ results, stats }: SessionCompletePayload) => {
      // Guard against double-invocation (StrictMode re-mount, fast rerenders).
      if (savedRef.current) return;
      savedRef.current = true;

      router.push(buildCustomResultUrl({ locale, token, timeLimit, results, stats }));
    },
    [locale, token, timeLimit, router]
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
    />
  );
}
