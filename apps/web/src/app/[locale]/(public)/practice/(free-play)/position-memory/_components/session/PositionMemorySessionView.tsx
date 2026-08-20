'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { usePieceAccuracy } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-piece-accuracy';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { useCountdown } from '../../_hooks/use-countdown';
import { useMemorizeTimer } from '../../_hooks/use-memorize-timer';
import { usePositionMemorySession } from '../../_hooks/use-position-memory-session';
import type { SessionMode } from '../../_lib/machines/types';
import { calculateAccuracy } from '../../_lib/preset-problems';
import type { SessionCompletePayload } from '../../_lib/result-serde';
import type { DisplayMode } from '../../_lib/session-config';
import type { PositionData } from '../../_lib/types';
import { PositionMemorySessionPhase } from './PositionMemorySessionPhase';

export type { SessionCompletePayload };

/**
 * Behavior flags that differ between the multi-problem and single-position
 * flavors of the session view. Grouped together so wrappers only pass one
 * object and the view's top-level prop list stays manageable.
 */
type SessionBehavior = {
  /** Enable pause/resume UI. Default: false. */
  enablePause?: boolean;
  /** When true, pressing skip acts like quit (single-position mode). */
  skipBehavesAsQuit?: boolean;
  /** Show the skip button in the memorize phase. Default: true. */
  showSkipButton?: boolean;
  /** If true, skip the inter-problem result phase and go straight to the session result. */
  skipProblemResult?: boolean;
};

type Props = {
  timeLimit: number;
  shuffle: boolean;
  /** Pre-built positions — when provided, `fens`/`problemCount` are ignored. */
  presetPositions?: PositionData[];
  fens?: string[];
  problemCount?: number;
  mode?: SessionMode;
  skipMemorize?: boolean;
  /** See {@link PositionMemoryRecreate}'s prop of the same name. */
  exitAction?: ReactNode;
  /** How to present the position during the memorize phase. Default: 'board'. */
  displayMode?: DisplayMode;
  behavior?: SessionBehavior;
  /** Called once when the machine enters `sessionResult`. */
  onSessionComplete: (payload: SessionCompletePayload) => void;
  /** Called when the user confirms finishing the tutorial on the problem-result screen. */
  onFinishTutorial?: () => void;
  /** Placeholder for the post-finish navigation window; forwarded to the phase. */
  finishFallback?: ReactNode;
};

/**
 * Pure phase renderer for the position-memory session.
 *
 * Delegates XState initialization and session-complete side effects to
 * `usePositionMemorySession`, hands the current phase to
 * `PositionMemorySessionPhase`, and forwards the quit modal. Flavor-specific
 * side effects (result-URL building, tutorial completion) are delegated to
 * the two session wrappers via callbacks.
 */
export function PositionMemorySessionView({
  timeLimit,
  shuffle,
  presetPositions,
  fens,
  problemCount = 1,
  mode = 'custom',
  skipMemorize = false,
  exitAction,
  displayMode = 'board',
  behavior,
  onSessionComplete,
  onFinishTutorial,
  finishFallback,
}: Props) {
  const {
    enablePause = false,
    skipBehavesAsQuit = false,
    showSkipButton = true,
    skipProblemResult = false,
  } = behavior ?? {};

  const t = useTranslations('practice.positionMemory');
  const { preferences, isLoaded } = useGamePreferences();
  const quitModalLabels = useQuitConfirmLabels({
    message: t('quitConfirmMessage'),
    confirmButton: t('quitConfirmYes'),
    cancelButton: t('quitConfirmNo'),
  });
  const { pieceNames, accuracyDescriptions } = usePieceAccuracy(t);

  const { state, send, positions, hasMounted } = usePositionMemorySession({
    timeLimit,
    shuffle,
    mode,
    presetPositions,
    fens,
    problemCount,
    skipMemorize,
    skipProblemResult,
    onSessionComplete,
  });

  const [isPaused, setIsPaused] = useState(false);
  const togglePause = useCallback(() => setIsPaused((prev) => !prev), []);
  useScrollToElement('position-memory-session', hasMounted);

  // Pre-session countdown (3, 2, 1, START!)
  const countdown = useCountdown({ initial: 3, paused: isPaused });

  // Memorize-phase ticker — suspended during countdown and while paused
  useMemorizeTimer({
    active: state.value === 'memorize',
    timeLeft: state.context.memorizeTimeLeft,
    paused: countdown !== null || isPaused,
    onTick: useCallback(() => send({ type: 'TICK' }), [send]),
  });

  const {
    currentProblemIndex,
    recreatedPosition,
    memorizeTimeLeft,
    currentAccuracy,
    showQuitModal,
  } = state.context;

  const originalPosition = useMemo<PositionData | null>(
    () => positions[currentProblemIndex] || null,
    [positions, currentProblemIndex]
  );

  const handleSubmit = useCallback(() => {
    if (!originalPosition) return;
    const accuracy = calculateAccuracy(
      originalPosition.fen,
      recreatedPosition,
      pieceNames,
      accuracyDescriptions
    );
    send({ type: 'SUBMIT', accuracy });
  }, [originalPosition, recreatedPosition, pieceNames, accuracyDescriptions, send]);

  const handleSkip = () => send({ type: skipBehavesAsQuit ? 'OPEN_QUIT_MODAL' : 'SKIP' });
  const handleQuitClick = () => send({ type: 'OPEN_QUIT_MODAL' });

  // Wait for positions to be initialized and preferences to be loaded (avoid SSR/hydration mismatch)
  if (!hasMounted || !isLoaded || positions.length === 0) {
    return null;
  }

  return (
    <>
      <PositionMemorySessionPhase
        phase={state.value as 'memorize' | 'recreate' | 'problemResult' | 'sessionResult' | 'other'}
        originalPosition={originalPosition}
        recreatedPosition={recreatedPosition}
        currentProblemIndex={currentProblemIndex}
        problemCount={positions.length}
        memorizeTimeLeft={memorizeTimeLeft}
        timeLimit={timeLimit}
        currentAccuracy={currentAccuracy}
        countdown={countdown}
        boardTheme={preferences.boardTheme}
        isTutorial={mode === 'tutorial'}
        enablePause={enablePause}
        isPaused={isPaused}
        showSkipButton={showSkipButton}
        // With memorize skipped, "view again" would re-enter memorize only to
        // be bounced straight back by the auto-MEMORIZED effect — the answer
        // flashes for a frame and nothing else happens. Hide it.
        showViewAgain={!skipMemorize}
        exitAction={exitAction}
        skipProblemResult={skipProblemResult}
        displayMode={displayMode}
        onMemorized={() => send({ type: 'MEMORIZED' })}
        onTogglePause={togglePause}
        onSkip={handleSkip}
        onQuit={handleQuitClick}
        onPositionChange={(fen) => send({ type: 'UPDATE_POSITION', fen })}
        onSubmit={handleSubmit}
        onViewAgain={() => send({ type: 'VIEW_AGAIN' })}
        onNextProblem={() => send({ type: 'NEXT_PROBLEM' })}
        onViewResults={() => send({ type: 'VIEW_RESULTS' })}
        onFinishTutorial={onFinishTutorial}
        finishFallback={finishFallback}
      />
      <QuitConfirmModal
        isOpen={showQuitModal}
        onConfirm={() => send({ type: 'CONFIRM_QUIT' })}
        onCancel={() => send({ type: 'CANCEL_QUIT' })}
        labels={quitModalLabels}
      />
    </>
  );
}
