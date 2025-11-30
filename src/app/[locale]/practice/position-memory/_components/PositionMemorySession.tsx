'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeComplete } from '@/app/[locale]/practice/_components/PracticeComplete';

import type { GamePhase, PositionAccuracy, PositionData } from '../_lib/types';
import { calculateAccuracy, getCustomPositions, getRandomPositions } from '../_lib/utils';
import { PositionMemoryMemorize } from './PositionMemoryMemorize';
import { PositionMemoryProblemResult } from './PositionMemoryProblemResult';
import { PositionMemoryRecreate } from './PositionMemoryRecreate';
import { QuitConfirmModal } from './QuitConfirmModal';

type ExtendedGamePhase = GamePhase | 'problem-result';

type Props = {
  locale: Locale;
  fens?: string[];
  timeLimit: number;
  shuffle: boolean;
  problemCount?: number;
};

export function PositionMemorySession({
  locale,
  fens,
  timeLimit,
  shuffle,
  problemCount = 1,
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

  // Initialize positions after mount
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);
      const initialPositions =
        fens && fens.length > 0
          ? getCustomPositions(fens, fens.length, shuffle)
          : getRandomPositions(problemCount, shuffle);
      setPositions(initialPositions);
    }
  }, [hasMounted, fens, shuffle, problemCount]);

  // Game state
  const [phase, setPhase] = useState<ExtendedGamePhase>('memorize');
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [recreatedPosition, setRecreatedPosition] = useState('8/8/8/8/8/8/8/8 w - - 0 1');
  const [memorizeTimeLeft, setMemorizeTimeLeft] = useState(timeLimit);
  const [currentAccuracy, setCurrentAccuracy] = useState<PositionAccuracy | null>(null);
  const [problemResults, setProblemResults] = useState<PositionAccuracy[]>([]);
  const [recreatedPositions, setRecreatedPositions] = useState<string[]>([]);
  const [showQuitModal, setShowQuitModal] = useState(false);

  // Derive originalPosition from positions and currentProblemIndex
  const originalPosition = useMemo<PositionData | null>(() => {
    return positions[currentProblemIndex] || null;
  }, [positions, currentProblemIndex]);

  const handleMemorized = useCallback(() => {
    setPhase('recreate');
    setRecreatedPosition('8/8/8/8/8/8/8/8 w - - 0 1');
  }, []);

  useEffect(() => {
    if (phase === 'memorize' && memorizeTimeLeft > 0) {
      const timer = setTimeout(() => {
        setMemorizeTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'memorize' && memorizeTimeLeft === 0) {
      handleMemorized();
    }
  }, [phase, memorizeTimeLeft, handleMemorized]);

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

    setCurrentAccuracy(accuracy);
    setProblemResults((prev) => [...prev, accuracy]);
    setRecreatedPositions((prev) => [...prev, recreatedPosition]);

    // Always show problem-result phase first
    setPhase('problem-result');
  }, [originalPosition, recreatedPosition, t, getScoreDescription]);

  const handleSkip = useCallback(() => {
    const nextIndex = currentProblemIndex + 1;

    // If there are more problems, move to the next one
    if (nextIndex < positions.length) {
      setCurrentProblemIndex(nextIndex);
      setMemorizeTimeLeft(timeLimit);
      setRecreatedPosition('8/8/8/8/8/8/8/8 w - - 0 1');
      setCurrentAccuracy(null);
      setPhase('memorize');
    } else {
      // No more problems, go to results
      setPhase('result');
    }
  }, [currentProblemIndex, positions, timeLimit]);

  const handleNextProblem = useCallback(() => {
    const nextIndex = currentProblemIndex + 1;
    setCurrentProblemIndex(nextIndex);
    setMemorizeTimeLeft(timeLimit);
    setRecreatedPosition('8/8/8/8/8/8/8/8 w - - 0 1');
    setCurrentAccuracy(null);
    setPhase('memorize');
  }, [currentProblemIndex, timeLimit]);

  const handlePlayAgain = useCallback(() => {
    // Restart the session with the same settings
    window.location.reload();
  }, []);

  const handleViewAgain = useCallback(() => {
    // Go back to memorize phase to view the position again
    setPhase('memorize');
    setMemorizeTimeLeft(timeLimit);
  }, [timeLimit]);

  const handleQuitClick = useCallback(() => {
    setShowQuitModal(true);
  }, []);

  const handleQuitConfirm = useCallback(() => {
    setShowQuitModal(false);
    // Move to result phase with current results
    setPhase('result');
  }, []);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
  }, []);

  // Wait for positions to be initialized (avoid SSR/hydration mismatch)
  if (!hasMounted || positions.length === 0) {
    return null;
  }

  // Memorize phase
  if (phase === 'memorize' && originalPosition) {
    return (
      <>
        <PositionMemoryMemorize
          position={originalPosition}
          memorizeTimeLeft={memorizeTimeLeft}
          currentProblemIndex={currentProblemIndex}
          problemCount={positions.length}
          boardTheme={preferences.boardTheme}
          onMemorized={handleMemorized}
          onSkip={handleSkip}
          onQuit={handleQuitClick}
        />
        <QuitConfirmModal
          isOpen={showQuitModal}
          onConfirm={handleQuitConfirm}
          onCancel={handleQuitCancel}
        />
      </>
    );
  }

  // Recreate phase
  if (phase === 'recreate' && originalPosition) {
    return (
      <>
        <PositionMemoryRecreate
          originalPosition={originalPosition}
          recreatedPosition={recreatedPosition}
          currentProblemIndex={currentProblemIndex}
          problemCount={positions.length}
          boardTheme={preferences.boardTheme}
          onPositionChange={setRecreatedPosition}
          onSubmit={handleSubmit}
          onViewAgain={handleViewAgain}
          onSkip={handleSkip}
          onQuit={handleQuitClick}
        />
        <QuitConfirmModal
          isOpen={showQuitModal}
          onConfirm={handleQuitConfirm}
          onCancel={handleQuitCancel}
        />
      </>
    );
  }

  // Problem result phase
  if (phase === 'problem-result' && currentAccuracy && originalPosition) {
    return (
      <PositionMemoryProblemResult
        accuracy={currentAccuracy}
        originalPosition={originalPosition}
        recreatedPosition={recreatedPosition}
        currentProblemIndex={currentProblemIndex}
        totalProblems={positions.length}
        boardTheme={preferences.boardTheme}
        onNextProblem={handleNextProblem}
        onViewResults={() => setPhase('result')}
      />
    );
  }

  // Final result phase
  if (phase === 'result') {
    // If no results yet (quit before solving any problem), show 0 score
    if (problemResults.length === 0) {
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
      problemResults.reduce((sum, r) => sum + r.accuracy, 0) / problemResults.length;
    const totalCorrect = problemResults.reduce((sum, r) => sum + r.correctPieces, 0);
    const totalPieces = problemResults.reduce((sum, r) => sum + r.totalPieces, 0);
    const totalIncorrect = problemResults.reduce((sum, r) => sum + r.incorrectPieces, 0);
    const totalMissing = problemResults.reduce((sum, r) => sum + r.missingPieces, 0);
    const totalExtra = problemResults.reduce((sum, r) => sum + r.extraPieces, 0);

    // Build individual problem results with FEN
    const individualResults = problemResults.map((result, index) => ({
      fen: positions[index]?.fen || '',
      recreatedFen: recreatedPositions[index] || '',
      isBlackToMove: positions[index]?.isBlackToMove || false,
      accuracy: result.accuracy,
      correctPieces: result.correctPieces,
      totalPieces: result.totalPieces,
      incorrectPieces: result.incorrectPieces,
      missingPieces: result.missingPieces,
      extraPieces: result.extraPieces,
    }));

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
        }}
        detailedStats={{
          correctPieces: totalCorrect,
          totalPieces: totalPieces,
          incorrectPieces: totalIncorrect,
          missingPieces: totalMissing,
          extraPieces: totalExtra,
        }}
        problemResults={individualResults}
      />
    );
  }

  return null;
}
