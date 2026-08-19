'use client';

import type { ReactNode } from 'react';

import type { BoardTheme } from '@/lib/games/board-themes';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';

import type { DisplayMode } from '../../_lib/session-config';
import type { PositionAccuracy, PositionData } from '../../_lib/types';
import { PositionMemoryMemorize } from './PositionMemoryMemorize';
import { PositionMemoryProblemResult } from './PositionMemoryProblemResult';
import { PositionMemoryRecreate } from './PositionMemoryRecreate';

type Phase = 'memorize' | 'recreate' | 'problemResult' | 'sessionResult' | 'other';

type Props = {
  phase: Phase;
  originalPosition: PositionData | null;
  recreatedPosition: string;
  currentProblemIndex: number;
  problemCount: number;
  memorizeTimeLeft: number;
  timeLimit: number;
  currentAccuracy: PositionAccuracy | null;
  countdown: number | null;
  boardTheme: BoardTheme;
  isTutorial: boolean;
  enablePause: boolean;
  isPaused: boolean;
  showSkipButton: boolean;
  /** See {@link PositionMemoryRecreate}'s prop of the same name. */
  showViewAgain: boolean;
  skipProblemResult: boolean;
  displayMode: DisplayMode;
  onMemorized: () => void;
  onTogglePause: () => void;
  onSkip: () => void;
  onQuit: () => void;
  onPositionChange: (fen: string) => void;
  onSubmit: () => void;
  onViewAgain: () => void;
  onNextProblem: () => void;
  onViewResults: () => void;
  onFinishTutorial?: () => void;
  /**
   * Placeholder rendered once the run finishes and navigation to the result
   * route is in flight. Defaults to the generic leaderboard-shaped skeleton;
   * the single/custom flows pass a board-comparison skeleton matching their
   * bespoke result route so the transition does not flash two different shapes.
   */
  finishFallback?: ReactNode;
};

/**
 * Dispatches the current XState phase to the per-phase presentational
 * component. Pulled out of `PositionMemorySessionView` so the view can
 * focus on state management and side effects.
 */
export function PositionMemorySessionPhase({
  phase,
  originalPosition,
  recreatedPosition,
  currentProblemIndex,
  problemCount,
  memorizeTimeLeft,
  timeLimit,
  currentAccuracy,
  countdown,
  boardTheme,
  isTutorial,
  enablePause,
  isPaused,
  showSkipButton,
  showViewAgain,
  skipProblemResult,
  displayMode,
  onMemorized,
  onTogglePause,
  onSkip,
  onQuit,
  onPositionChange,
  onSubmit,
  onViewAgain,
  onNextProblem,
  onViewResults,
  onFinishTutorial,
  finishFallback = <PracticeResultSkeleton />,
}: Props) {
  if (phase === 'memorize' && originalPosition) {
    return (
      <div id="position-memory-session">
        <PositionMemoryMemorize
          position={originalPosition}
          memorizeTimeLeft={memorizeTimeLeft}
          currentProblemIndex={currentProblemIndex}
          problemCount={problemCount}
          boardTheme={boardTheme}
          displayMode={displayMode}
          onMemorized={onMemorized}
          onSkip={onSkip}
          onQuit={onQuit}
          countdown={countdown}
          timeLimit={timeLimit}
          isPaused={enablePause ? isPaused : undefined}
          onTogglePause={enablePause ? onTogglePause : undefined}
          showSkip={showSkipButton}
        />
      </div>
    );
  }

  if (phase === 'recreate' && originalPosition) {
    return (
      <PositionMemoryRecreate
        originalPosition={originalPosition}
        recreatedPosition={recreatedPosition}
        currentProblemIndex={currentProblemIndex}
        problemCount={problemCount}
        boardTheme={boardTheme}
        isTutorial={isTutorial}
        showSkip={showSkipButton}
        showViewAgain={showViewAgain}
        onPositionChange={onPositionChange}
        onSubmit={onSubmit}
        onViewAgain={onViewAgain}
        onSkip={onSkip}
        onQuit={onQuit}
      />
    );
  }

  if (!skipProblemResult && phase === 'problemResult' && currentAccuracy && originalPosition) {
    return (
      <PositionMemoryProblemResult
        accuracy={currentAccuracy}
        originalPosition={originalPosition}
        recreatedPosition={recreatedPosition}
        currentProblemIndex={currentProblemIndex}
        totalProblems={problemCount}
        boardTheme={boardTheme}
        isTutorial={isTutorial}
        onNextProblem={onNextProblem}
        onViewResults={onViewResults}
        onFinishTutorial={onFinishTutorial}
      />
    );
  }

  return <>{finishFallback}</>;
}
