'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { SessionMode } from '../../_lib/machines/types';
import { buildMultiResultUrl } from '../../_lib/result-url';
import { type DisplayMode } from '../../_lib/session-config';
import {
  PositionMemorySessionView,
  type SessionCompletePayload,
} from './PositionMemorySessionView';

type Props = {
  locale: Locale;
  timeLimit: number;
  shuffle: boolean;
  fens?: string[];
  problemCount?: number;
  mode?: SessionMode;
  skipMemorize?: boolean;
  isCustomFen?: boolean;
  displayMode?: DisplayMode;
  rawProblemsParam?: string;
  sourceParam?: string;
  modeParam?: string;
};

/**
 * Session wrapper for the preset / custom-FEN multi-problem flow.
 *
 * Fixes the session-view flags that distinguish the multi-problem flavor
 * (skip button visible, inter-problem result page shown) and owns the two
 * wrapper-specific side effects: building the multi-problem result-page URL
 * when the session completes, and handling tutorial completion from the
 * per-problem result screen.
 */
export function MultiProblemSession({
  locale,
  timeLimit,
  shuffle,
  fens,
  problemCount = 1,
  mode = 'custom',
  skipMemorize = false,
  isCustomFen = false,
  displayMode = 'board',
  rawProblemsParam,
  sourceParam,
  modeParam,
}: Props) {
  const router = useRouter();

  const handleSessionComplete = useCallback(
    ({ results, stats, totalAccuracy }: SessionCompletePayload) => {
      const url = buildMultiResultUrl({
        locale,
        results,
        stats,
        totalAccuracy,
        isCustomFen,
        timeLimit,
        shuffle,
        problemCount,
        rawProblemsParam,
        sourceParam,
        modeParam,
      });
      router.push(url);
    },
    [
      locale,
      isCustomFen,
      timeLimit,
      shuffle,
      problemCount,
      rawProblemsParam,
      sourceParam,
      modeParam,
      router,
    ]
  );

  const handleFinishTutorial = useCallback(() => {
    window.location.href = `/${locale}/practice/position-memory`;
  }, [locale]);

  return (
    <PositionMemorySessionView
      timeLimit={timeLimit}
      shuffle={shuffle}
      fens={fens}
      problemCount={problemCount}
      mode={mode}
      skipMemorize={skipMemorize}
      displayMode={displayMode}
      onSessionComplete={handleSessionComplete}
      onFinishTutorial={handleFinishTutorial}
    />
  );
}
