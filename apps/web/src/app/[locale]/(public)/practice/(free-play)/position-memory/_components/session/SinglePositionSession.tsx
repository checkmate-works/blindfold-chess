'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { buildSingleResultUrl } from '../../_lib/result-url';
import type { PositionData } from '../../_lib/types';
import {
  PositionMemorySessionView,
  type SessionCompletePayload,
} from './PositionMemorySessionView';

type Props = {
  locale: Locale;
  positionId: string;
  timeLimit: number;
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
export function SinglePositionSession({ locale, positionId, timeLimit, position }: Props) {
  const router = useRouter();

  const handleSessionComplete = useCallback(
    ({ results, stats }: SessionCompletePayload) => {
      const url = buildSingleResultUrl({
        locale,
        positionId,
        timeLimit,
        results,
        stats,
      });
      router.push(url);
    },
    [locale, positionId, timeLimit, router]
  );

  return (
    <PositionMemorySessionView
      timeLimit={timeLimit}
      shuffle={false}
      presetPositions={[position]}
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
