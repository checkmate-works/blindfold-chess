'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useMachine } from '@xstate/react';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeComplete } from '@/app/[locale]/practice/_components/PracticeComplete';
import { QuitConfirmModal } from '@/app/[locale]/practice/_components/QuitConfirmModal';

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
}: Props) {
  const t = useTranslations('practice.positionMemory');
  const tPractice = useTranslations('practice');
  const { preferences } = useGamePreferences();

  // Helper function to get score description
  const getScoreDescription = useCallback(
    (type: 'correct' | 'wrongPiece' | 'missing' | 'extra', params: Record<string, string>) => {
      return t(`scoreDescriptions.${type}`, params);
    },
    [t]
  );

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

  // Scroll to session element after mount
  useEffect(() => {
    if (!hasMounted) return;

    // Tiny delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById('position-memory-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, [hasMounted]);

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

  const originalPosition = useMemo<PositionData | null>(() => {
    return positions[currentProblemIndex] || null;
  }, [positions, currentProblemIndex]);

  const handleMemorized = useCallback(() => {
    send({ type: 'MEMORIZED' });
  }, [send]);

  const handleSubmit = useCallback(() => {
    if (!originalPosition) return;

    // Create pieceNames object for calculateAccuracy
    const pieceNames: Record<string, string> = {
      K: t('pieceNames.K'),
      Q: t('pieceNames.Q'),
      R: t('pieceNames.R'),
      B: t('pieceNames.B'),
      N: t('pieceNames.N'),
      P: t('pieceNames.P'),
      k: t('pieceNames.k'),
      q: t('pieceNames.q'),
      r: t('pieceNames.r'),
      b: t('pieceNames.b'),
      n: t('pieceNames.n'),
      p: t('pieceNames.p'),
    };

    // Create descriptions object for calculateAccuracy
    const accuracyDescriptions = {
      correct: (piece: string, square: string) => getScoreDescription('correct', { piece, square }),
      wrongPiece: (square: string, expected: string, actual: string) =>
        getScoreDescription('wrongPiece', { square, expected, actual }),
      missing: (piece: string, square: string) => getScoreDescription('missing', { piece, square }),
      extra: (piece: string, square: string) => getScoreDescription('extra', { piece, square }),
    };

    const accuracy = calculateAccuracy(
      originalPosition.fen,
      recreatedPosition,
      pieceNames,
      accuracyDescriptions
    );

    send({ type: 'SUBMIT', accuracy });
  }, [originalPosition, recreatedPosition, t, getScoreDescription, send]);

  const handleSkip = useCallback(() => {
    send({ type: 'SKIP' });
  }, [send]);

  const handleNextProblem = useCallback(() => {
    send({ type: 'NEXT_PROBLEM' });
  }, [send]);

  const handlePlayAgain = useCallback(() => {
    // Always navigate to setup page
    window.location.href = `/${locale}/practice/position-memory`;
  }, [locale]);

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

  // Delete FEN from localStorage
  const handleDeleteFen = useCallback((fenToDelete: string) => {
    try {
      const savedSettings = localStorage.getItem('positionMemorySettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.customFenInput) {
          const fensFromStorage = settings.customFenInput
            .trim()
            .split('\n')
            .filter((line: string) => line.trim());
          const updatedFens = fensFromStorage.filter(
            (fen: string) => fen.trim() !== fenToDelete.trim()
          );
          settings.customFenInput = updatedFens.join('\n');
          localStorage.setItem('positionMemorySettings', JSON.stringify(settings));
        }
      }
    } catch (error) {
      console.error('Failed to delete FEN from localStorage:', error);
    }
  }, []);

  // Check if tutorial mode
  const isTutorial = mode === 'tutorial';

  // Handle finish tutorial
  const handleFinishTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_SKIPPED_KEY, 'true');
    window.location.href = `/${locale}/practice/position-memory`;
  }, [locale]);

  // Wait for positions to be initialized (avoid SSR/hydration mismatch)
  if (!hasMounted || positions.length === 0) {
    return null;
  }

  // Memorize phase
  if (state.value === 'memorize' && originalPosition) {
    return (
      <div id="position-memory-session">
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

  // Final result phase
  if (state.value === 'sessionResult') {
    // Convert Map to array for calculations
    const resultsArray = Array.from(problemResults.values());

    // If no results yet (quit before solving any problem), show 0 score
    if (resultsArray.length === 0 && skippedProblems.size === 0) {
      return (
        <PracticeComplete
          score={0}
          total={100}
          onTryAgain={handlePlayAgain}
          locale={locale}
          labels={{
            practiceComplete: tPractice('practiceComplete'),
            score: `${t('accuracy')}: 0.0% (0/0)`,
            tryAgain: tPractice('tryAgain'),
            morePractice: tPractice('morePractice'),
          }}
        />
      );
    }

    const totalAccuracy =
      resultsArray.length > 0
        ? resultsArray.reduce((sum, r) => sum + r.accuracy, 0) / resultsArray.length
        : 0;
    const totalCorrect = resultsArray.reduce((sum, r) => sum + r.correctPieces, 0);
    const totalPieces = resultsArray.reduce((sum, r) => sum + r.totalPieces, 0);
    const totalIncorrect = resultsArray.reduce((sum, r) => sum + r.incorrectPieces, 0);
    const totalMissing = resultsArray.reduce((sum, r) => sum + r.missingPieces, 0);
    const totalExtra = resultsArray.reduce((sum, r) => sum + r.extraPieces, 0);

    // Build individual problem results with FEN (including skipped problems)
    const individualResults = positions.map((position, index) => {
      const result = problemResults.get(index);
      // Mark as skipped if explicitly skipped OR if no result exists (quit before answering)
      const isSkipped = skippedProblems.has(index) || !result;

      return {
        fen: position.fen,
        recreatedFen: recreatedPositions.get(index) || '',
        isBlackToMove: position.isBlackToMove,
        accuracy: result?.accuracy ?? 0,
        correctPieces: result?.correctPieces ?? 0,
        totalPieces: result?.totalPieces ?? 0,
        incorrectPieces: result?.incorrectPieces ?? 0,
        missingPieces: result?.missingPieces ?? 0,
        extraPieces: result?.extraPieces ?? 0,
        originalIndex: index,
        skipped: isSkipped,
      };
    });

    return (
      <PracticeComplete
        score={Math.round(totalAccuracy)}
        total={100}
        onTryAgain={handlePlayAgain}
        locale={locale}
        labels={{
          practiceComplete: tPractice('practiceComplete'),
          score: `${t('accuracy')}: ${totalAccuracy.toFixed(1)}% (${totalCorrect}/${totalPieces})`,
          tryAgain: tPractice('tryAgain'),
          morePractice: tPractice('morePractice'),
          recreationProgress: t('recreationProgress'),
          correct: t('correct'),
          incorrect: t('incorrect'),
          missing: t('missing'),
          extra: t('extra'),
          extraDescription: t('extraDescription'),
          problemDetails: t('problemDetails'),
          problem: t('problem'),
          original: t('original'),
          yourRecreation: t('yourRecreation'),
          deleteFenTitle: t('deleteFenTitle'),
          deleteFenMessage: t('deleteFenMessage'),
          deleteFenConfirm: t('deleteFenConfirm'),
          deleteFenCancel: t('deleteFenCancel'),
          skipped: t('skipped'),
          analyzeOnLichess: t('analyzeOnLichess'),
        }}
        detailedStats={{
          correctPieces: totalCorrect,
          totalPieces: totalPieces,
          incorrectPieces: totalIncorrect,
          missingPieces: totalMissing,
          extraPieces: totalExtra,
        }}
        problemResults={individualResults}
        isCustomFen={isCustomFen}
        onDeleteFen={handleDeleteFen}
      />
    );
  }

  return null;
}
