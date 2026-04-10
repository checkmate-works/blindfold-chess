'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { useMachine } from '@xstate/react';

import { usePieceAccuracy } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-piece-accuracy';
import { aggregateResults } from '@/app/[locale]/(public)/practice/(free-play)/_lib/aggregate-results';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { positionMemoryMachine } from '../_lib/machines/positionMemoryMachine';
import type { SessionMode } from '../_lib/machines/types';
import type { SerializedResultItem, SerializedStats } from '../_lib/result-serde';
import { buildMultiResultUrl } from '../_lib/result-url';
import type { PositionData } from '../_lib/types';
import { calculateAccuracy, getCustomPositions, getRandomPositions } from '../_lib/utils';
import { PositionMemoryMemorize } from './PositionMemoryMemorize';
import { PositionMemoryProblemResult } from './PositionMemoryProblemResult';
import { PositionMemoryRecreate } from './PositionMemoryRecreate';
import { TUTORIAL_SKIPPED_KEY } from './TutorialSkipLink';

type BuildResultUrlArgs = {
  locale: Locale;
  results: SerializedResultItem[];
  stats: SerializedStats;
  totalAccuracy: number;
};

type Props = {
  locale: Locale;
  timeLimit: number;
  shuffle: boolean;
  /** Pre-built positions — when provided, `fens`/`problemCount` are ignored. */
  presetPositions?: PositionData[];
  fens?: string[];
  problemCount?: number;
  mode?: SessionMode;
  skipMemorize?: boolean;
  isCustomFen?: boolean;
  rawProblemsParam?: string;
  sourceParam?: string;
  modeParam?: string;
  /** Enable pause/resume UI. Default: false. */
  enablePause?: boolean;
  /** When set, pressing skip acts like quit (single-position mode). */
  skipBehavesAsQuit?: boolean;
  /** Hide the skip button in the memorize phase. Default: true (shown). */
  showSkipButton?: boolean;
  /** If true, skip the inter-problem result phase and go straight to the session result. */
  skipProblemResult?: boolean;
  /** Custom result-page URL builder. Defaults to the multi-problem result page. */
  buildResultUrl?: (args: BuildResultUrlArgs) => string;
};

export function PositionMemorySession({
  locale,
  timeLimit,
  shuffle,
  presetPositions,
  fens,
  problemCount = 1,
  mode = 'custom',
  skipMemorize = false,
  isCustomFen = false,
  rawProblemsParam,
  sourceParam,
  modeParam,
  enablePause = false,
  skipBehavesAsQuit = false,
  showSkipButton = true,
  skipProblemResult = false,
  buildResultUrl,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();
  const quitModalLabels = useQuitConfirmLabels({
    message: t('quitConfirmMessage'),
    confirmButton: t('quitConfirmYes'),
    cancelButton: t('quitConfirmNo'),
  });
  const { pieceNames, accuracyDescriptions } = usePieceAccuracy(t);

  // Track if component has mounted (to avoid SSR/hydration mismatch)
  const [hasMounted, setHasMounted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize positions only on client side to avoid hydration mismatch with Math.random()
  const [positions, setPositions] = useState<PositionData[]>(() => presetPositions ?? []);

  // Create machine (will receive positions via SET_POSITIONS event)
  const [state, send] = useMachine(positionMemoryMachine, {
    input: {
      positions: presetPositions ?? [],
      timeLimit,
      mode,
    },
  });

  // Initialize positions after mount and send to machine
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);
      if (presetPositions && presetPositions.length > 0) {
        // Positions were supplied by the caller; machine already received
        // them via input, but send SET_POSITIONS so subsequent renders stay
        // in sync with component state.
        setPositions(presetPositions);
        send({ type: 'SET_POSITIONS', positions: presetPositions });
        return;
      }
      const initialPositions =
        fens && fens.length > 0
          ? getCustomPositions(fens, problemCount, shuffle)
          : getRandomPositions(problemCount, shuffle);
      setPositions(initialPositions);
      // Update machine context with loaded positions
      send({ type: 'SET_POSITIONS', positions: initialPositions });
    }
  }, [hasMounted, presetPositions, fens, shuffle, problemCount, send]);

  // Skip memorize phase if requested (for tutorial)
  useEffect(() => {
    if (skipMemorize && state.value === 'memorize' && positions.length > 0) {
      send({ type: 'MEMORIZED' });
    }
  }, [skipMemorize, state.value, positions.length, send]);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(3);

  useScrollToElement('position-memory-session', hasMounted);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (isPaused) return;

    if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
      }, 500); // Show "START!" for 0.5s
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, isPaused]);

  // Timer effect for memorize phase
  useEffect(() => {
    if (countdown !== null) return; // Don't start timer during countdown
    if (isPaused) return;

    if (state.value === 'memorize' && state.context.memorizeTimeLeft >= 0) {
      const timer = setTimeout(() => {
        send({ type: 'TICK' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.value, state.context.memorizeTimeLeft, send, countdown, isPaused]);

  // Derive values from state context
  const {
    currentProblemIndex,
    recreatedPosition,
    memorizeTimeLeft,
    currentAccuracy,
    problemResults,
    recreatedPositions,
    skippedProblems,
    showQuitModal,
  } = state.context;

  // When `skipProblemResult` is true, transition straight from problemResult to sessionResult.
  useEffect(() => {
    if (skipProblemResult && state.value === 'problemResult') {
      send({ type: 'VIEW_RESULTS' });
    }
  }, [skipProblemResult, state.value, send]);

  // Final result phase - Redirect to result page
  useEffect(() => {
    if (state.value !== 'sessionResult') return;

    // Convert Map to array for calculations
    const resultsArray = Array.from(problemResults.values());

    // Calculate stats
    const { totalAccuracy, totalCorrect, totalPieces, totalIncorrect, totalMissing, totalExtra } =
      aggregateResults(resultsArray);

    const serializedResults: SerializedResultItem[] = positions.map((position, index) => {
      const result = problemResults.get(index);
      const isSkipped = skippedProblems.has(index) || !result;
      return {
        f: position.fen,
        r: recreatedPositions.get(index) || '',
        b: position.isBlackToMove ? 1 : 0,
        a: result?.accuracy ?? 0,
        c: result?.correctPieces ?? 0,
        t: result?.totalPieces ?? 0,
        i: result?.incorrectPieces ?? 0,
        m: result?.missingPieces ?? 0,
        e: result?.extraPieces ?? 0,
        o: index,
        s: isSkipped ? 1 : 0,
      };
    });

    const serializedStats: SerializedStats = {
      c: totalCorrect,
      t: totalPieces,
      i: totalIncorrect,
      m: totalMissing,
      e: totalExtra,
    };

    const url = buildResultUrl
      ? buildResultUrl({
          locale,
          results: serializedResults,
          stats: serializedStats,
          totalAccuracy,
        })
      : buildMultiResultUrl({
          locale,
          results: serializedResults,
          stats: serializedStats,
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
  }, [
    state.value,
    problemResults,
    skippedProblems,
    positions,
    recreatedPositions,
    isCustomFen,
    locale,
    router,
    timeLimit,
    shuffle,
    problemCount,
    rawProblemsParam,
    sourceParam,
    modeParam,
    buildResultUrl,
  ]);

  const originalPosition = useMemo<PositionData | null>(() => {
    return positions[currentProblemIndex] || null;
  }, [positions, currentProblemIndex]);

  const handleMemorized = useCallback(() => {
    send({ type: 'MEMORIZED' });
  }, [send]);

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

  const handleSkip = useCallback(() => {
    if (skipBehavesAsQuit) {
      send({ type: 'OPEN_QUIT_MODAL' });
    } else {
      send({ type: 'SKIP' });
    }
  }, [send, skipBehavesAsQuit]);

  const handleNextProblem = useCallback(() => {
    send({ type: 'NEXT_PROBLEM' });
  }, [send]);

  const handleViewAgain = useCallback(() => {
    send({ type: 'VIEW_AGAIN' });
  }, [send]);

  const handleQuitClick = useCallback(() => {
    send({ type: 'OPEN_QUIT_MODAL' });
  }, [send]);

  const handleQuitConfirm = useCallback(() => {
    send({ type: 'CONFIRM_QUIT' });
  }, [send]);

  const handleQuitCancel = useCallback(() => {
    send({ type: 'CANCEL_QUIT' });
  }, [send]);

  const handlePositionChange = useCallback(
    (fen: string) => {
      send({ type: 'UPDATE_POSITION', fen });
    },
    [send]
  );

  // Check if tutorial mode
  const isTutorial = mode === 'tutorial';

  // Handle finish tutorial
  const handleFinishTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_SKIPPED_KEY, 'true');
    window.location.href = `/${locale}/practice/position-memory`;
  }, [locale]);

  // Wait for positions to be initialized and preferences to be loaded (avoid SSR/hydration mismatch)
  if (!hasMounted || !isLoaded || positions.length === 0) {
    return null;
  }

  // Memorize phase
  if (state.value === 'memorize' && originalPosition) {
    return (
      <div id="position-memory-session" className="min-h-screen">
        <PositionMemoryMemorize
          position={originalPosition}
          memorizeTimeLeft={memorizeTimeLeft}
          currentProblemIndex={currentProblemIndex}
          problemCount={positions.length}
          boardTheme={preferences.boardTheme}
          onMemorized={handleMemorized}
          onSkip={handleSkip}
          onQuit={handleQuitClick}
          countdown={countdown}
          timeLimit={timeLimit}
          isPaused={enablePause ? isPaused : undefined}
          onTogglePause={enablePause ? togglePause : undefined}
          showSkip={showSkipButton}
        />
        <QuitConfirmModal
          isOpen={showQuitModal}
          onConfirm={handleQuitConfirm}
          onCancel={handleQuitCancel}
          labels={quitModalLabels}
        />
      </div>
    );
  }

  // Recreate phase
  if (state.value === 'recreate' && originalPosition) {
    return (
      <>
        <PositionMemoryRecreate
          originalPosition={originalPosition}
          recreatedPosition={recreatedPosition}
          currentProblemIndex={currentProblemIndex}
          problemCount={positions.length}
          boardTheme={preferences.boardTheme}
          isTutorial={isTutorial}
          onPositionChange={handlePositionChange}
          onSubmit={handleSubmit}
          onViewAgain={handleViewAgain}
          onSkip={handleSkip}
          onQuit={handleQuitClick}
        />
        <QuitConfirmModal
          isOpen={showQuitModal}
          onConfirm={handleQuitConfirm}
          onCancel={handleQuitCancel}
          labels={quitModalLabels}
        />
      </>
    );
  }

  // Problem result phase
  if (
    !skipProblemResult &&
    state.value === 'problemResult' &&
    currentAccuracy &&
    originalPosition
  ) {
    return (
      <PositionMemoryProblemResult
        accuracy={currentAccuracy}
        originalPosition={originalPosition}
        recreatedPosition={recreatedPosition}
        currentProblemIndex={currentProblemIndex}
        totalProblems={positions.length}
        boardTheme={preferences.boardTheme}
        isTutorial={isTutorial}
        onNextProblem={handleNextProblem}
        onViewResults={() => send({ type: 'VIEW_RESULTS' })}
        onFinishTutorial={handleFinishTutorial}
      />
    );
  }

  if (state.value === 'sessionResult') {
    return <PracticeResultSkeleton />;
  }

  return <PracticeResultSkeleton />;
}
