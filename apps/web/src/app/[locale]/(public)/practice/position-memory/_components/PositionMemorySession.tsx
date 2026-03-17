'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { useMachine } from '@xstate/react';

import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { usePieceAccuracy } from '@/app/[locale]/(public)/practice/_hooks/use-piece-accuracy';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PracticeResultSkeleton } from '../../_components/PracticeResultSkeleton';
import { positionMemoryMachine } from '../_lib/machines/positionMemoryMachine';
import type { SessionMode } from '../_lib/machines/types';
import type { PositionData } from '../_lib/types';
import { calculateAccuracy, getCustomPositions, getRandomPositions } from '../_lib/utils';
import { PositionMemoryMemorize } from './PositionMemoryMemorize';
import { PositionMemoryProblemResult } from './PositionMemoryProblemResult';
import { PositionMemoryRecreate } from './PositionMemoryRecreate';
import { TUTORIAL_SKIPPED_KEY } from './TutorialSkipLink';

type Props = {
  locale: Locale;
  fens?: string[];
  timeLimit: number;
  shuffle: boolean;
  problemCount?: number;
  mode?: SessionMode;
  skipMemorize?: boolean;
  isCustomFen?: boolean;
  rawProblemsParam?: string;
  sourceParam?: string;
  modeParam?: string;
};

export function PositionMemorySession({
  locale,
  fens,
  timeLimit,
  shuffle,
  problemCount = 1,
  mode = 'custom',
  skipMemorize = false,
  isCustomFen = false,
  rawProblemsParam,
  sourceParam,
  modeParam,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();
  const { pieceNames, accuracyDescriptions } = usePieceAccuracy(t);

  // Track if component has mounted (to avoid SSR/hydration mismatch)
  const [hasMounted, setHasMounted] = useState(false);

  // Initialize positions only on client side to avoid hydration mismatch with Math.random()
  const [positions, setPositions] = useState<PositionData[]>([]);

  // Create machine (will receive positions via SET_POSITIONS event)
  const [state, send] = useMachine(positionMemoryMachine, {
    input: {
      positions: [],
      timeLimit,
      mode,
    },
  });

  // Initialize positions after mount and send to machine
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);
      const initialPositions =
        fens && fens.length > 0
          ? getCustomPositions(fens, problemCount, shuffle)
          : getRandomPositions(problemCount, shuffle);
      setPositions(initialPositions);
      // Update machine context with loaded positions
      send({ type: 'SET_POSITIONS', positions: initialPositions });
    }
  }, [hasMounted, fens, shuffle, problemCount, send]);

  // Skip memorize phase if requested (for tutorial)
  useEffect(() => {
    if (skipMemorize && state.value === 'memorize' && positions.length > 0) {
      send({ type: 'MEMORIZED' });
    }
  }, [skipMemorize, state.value, positions.length, send]);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(3);

  useScrollToElement('position-memory-session', hasMounted);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

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
  }, [countdown]);

  // Timer effect for memorize phase
  useEffect(() => {
    if (countdown !== null) return; // Don't start timer during countdown

    if (state.value === 'memorize' && state.context.memorizeTimeLeft >= 0) {
      const timer = setTimeout(() => {
        send({ type: 'TICK' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.value, state.context.memorizeTimeLeft, send, countdown]);

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

  // Final result phase - Redirect to result page
  useEffect(() => {
    if (state.value === 'sessionResult') {
      // Convert Map to array for calculations
      const resultsArray = Array.from(problemResults.values());

      // Calculate stats
      const totalAccuracy =
        resultsArray.length > 0
          ? resultsArray.reduce((sum, r) => sum + r.accuracy, 0) / resultsArray.length
          : 0;

      const totalCorrect = resultsArray.reduce((sum, r) => sum + r.correctPieces, 0);
      const totalPieces = resultsArray.reduce((sum, r) => sum + r.totalPieces, 0);
      const totalIncorrect = resultsArray.reduce((sum, r) => sum + r.incorrectPieces, 0);
      const totalMissing = resultsArray.reduce((sum, r) => sum + r.missingPieces, 0);
      const totalExtra = resultsArray.reduce((sum, r) => sum + r.extraPieces, 0);

      // Serialize data
      // f=fen, r=recreatedFen, b=isBlackToMove, a=accuracy, c=correctPieces
      // t=totalPieces, i=incorrectPieces, m=missingPieces, e=extraPieces
      // o=originalIndex, s=skipped
      const serializedResults = positions.map((position, index) => {
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

      const serializedStats = {
        c: totalCorrect,
        t: totalPieces,
        i: totalIncorrect,
        m: totalMissing,
        e: totalExtra,
      };

      const params = new URLSearchParams();
      params.set('score', Math.round(totalAccuracy).toString());
      params.set('total', '100');
      params.set('custom', isCustomFen ? 'true' : 'false');
      params.set('data', encodeURIComponent(JSON.stringify(serializedResults)));
      params.set('stats', encodeURIComponent(JSON.stringify(serializedStats)));

      // Pass through session configuration for retry
      params.set('timeLimit', timeLimit.toString());
      params.set('shuffle', shuffle ? '1' : '0');
      params.set('count', problemCount.toString());
      if (rawProblemsParam) params.set('problems', rawProblemsParam);
      if (sourceParam) params.set('source', sourceParam);
      if (modeParam) params.set('mode', modeParam);

      router.push(`/${locale}/practice/position-memory/result?${params.toString()}`);
    }
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
    send({ type: 'SKIP' });
  }, [send]);

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

  // Labels for QuitConfirmModal
  const quitModalLabels = useMemo(
    () => ({
      title: t('quitConfirmTitle'),
      message: t('quitConfirmMessage'),
      confirmButton: t('quitConfirmYes'),
      cancelButton: t('quitConfirmNo'),
    }),
    [t]
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
  if (state.value === 'problemResult' && currentAccuracy && originalPosition) {
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
