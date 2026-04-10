'use client';

import type { Locale } from '@/app/[locale]/_lib/types';

import { buildSingleResultUrl } from '../../_lib/result-url';
import type { PositionData } from '../../_lib/types';
import { PositionMemorySessionView } from './PositionMemorySessionView';

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
 * result page is skipped, and the result URL points at the per-position
 * result route.
 */
export function SinglePositionSession({ locale, positionId, timeLimit, position }: Props) {
  return (
    <PositionMemorySessionView
      locale={locale}
      timeLimit={timeLimit}
      shuffle={false}
      presetPositions={[position]}
      enablePause
      skipBehavesAsQuit
      showSkipButton={false}
      skipProblemResult
      buildResultUrl={({ results, stats }) =>
        buildSingleResultUrl({
          locale,
          positionId,
          timeLimit,
          results,
          stats,
        })
      }
    />
  );
}
