'use client';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { SessionMode } from '../../_lib/machines/types';
import { PositionMemorySessionView } from './PositionMemorySessionView';

type Props = {
  locale: Locale;
  timeLimit: number;
  shuffle: boolean;
  fens?: string[];
  problemCount?: number;
  mode?: SessionMode;
  skipMemorize?: boolean;
  isCustomFen?: boolean;
  rawProblemsParam?: string;
  sourceParam?: string;
  modeParam?: string;
};

/**
 * Session wrapper for the preset / custom-FEN multi-problem flow.
 *
 * Fixes the session-view flags that distinguish the multi-problem flavor
 * (skip button visible, quit modal optional, inter-problem result page)
 * so the caller only has to pass the parameters that vary between runs.
 */
export function MultiProblemSession(props: Props) {
  return (
    <PositionMemorySessionView
      {...props}
      enablePause={false}
      skipBehavesAsQuit={false}
      showSkipButton
      skipProblemResult={false}
    />
  );
}
