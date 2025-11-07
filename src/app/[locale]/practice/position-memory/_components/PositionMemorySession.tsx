'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeComplete } from '@/app/[locale]/practice/_components/PracticeComplete';

import type { GamePhase, PositionAccuracy, PositionData } from '../_lib/types';
import { calculateAccuracy, getCustomPositions, getRandomPositions } from '../_lib/utils';
import { PositionMemoryMemorize } from './PositionMemoryMemorize';
import { PositionMemoryProblemResult } from './PositionMemoryProblemResult';
import { PositionMemoryRecreate } from './PositionMemoryRecreate';

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

  // Helper function to get score description
  const getScoreDescription = useCallback(
    (type: 'correct' | 'wrongPiece' | 'missing' | 'extra', params: Record<string, string>) => {
      return t(`scoreDescriptions.${type}`, params);
    },
    [t]
  );

  // Game state
  const [phase, setPhase] = useState<ExtendedGamePhase>('memorize');
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [originalPosition, setOriginalPosition] = useState<PositionData | null>(null);
  const [recreatedPosition, setRecreatedPosition] = useState('8/8/8/8/8/8/8/8 w - - 0 1');
  const [memorizeTimeLeft, setMemorizeTimeLeft] = useState(timeLimit);
  const [currentAccuracy, setCurrentAccuracy] = useState<PositionAccuracy | null>(null);
  const [problemResults, setProblemResults] = useState<PositionAccuracy[]>([]);

  // Initialize positions on mount
  useEffect(() => {
    let newPositions: PositionData[];

    if (fens && fens.length > 0) {
      newPositions = getCustomPositions(fens, fens.length, shuffle);
    } else {
      newPositions = getRandomPositions(problemCount, shuffle);
    }

    setPositions(newPositions);
    setOriginalPosition(newPositions[0]);
    setMemorizeTimeLeft(timeLimit);
  }, [fens, problemCount, shuffle, timeLimit]);

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

    // Always show problem-result phase first
    setPhase('problem-result');
  }, [originalPosition, recreatedPosition, t, getScoreDescription]);

  const handleNextProblem = useCallback(() => {
    const nextIndex = currentProblemIndex + 1;
    setCurrentProblemIndex(nextIndex);
    setOriginalPosition(positions[nextIndex]);
    setMemorizeTimeLeft(timeLimit);
    setRecreatedPosition('8/8/8/8/8/8/8/8 w - - 0 1');
    setCurrentAccuracy(null);
    setPhase('memorize');
  }, [currentProblemIndex, positions, timeLimit]);

  const handlePlayAgain = useCallback(() => {
    // Restart the session with the same settings
    window.location.reload();
  }, []);

  const handleViewAgain = useCallback(() => {
    // Go back to memorize phase to view the position again
    setPhase('memorize');
    setMemorizeTimeLeft(timeLimit);
  }, [timeLimit]);

  // Memorize phase
  if (phase === 'memorize' && originalPosition) {
    return (
      <PositionMemoryMemorize
        position={originalPosition}
        memorizeTimeLeft={memorizeTimeLeft}
        currentProblemIndex={currentProblemIndex}
        problemCount={positions.length}
        onMemorized={handleMemorized}
      />
    );
  }

  // Recreate phase
  if (phase === 'recreate' && originalPosition) {
    return (
      <PositionMemoryRecreate
        originalPosition={originalPosition}
        recreatedPosition={recreatedPosition}
        currentProblemIndex={currentProblemIndex}
        problemCount={positions.length}
        onPositionChange={setRecreatedPosition}
        onSubmit={handleSubmit}
        onViewAgain={handleViewAgain}
      />
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
        onNextProblem={handleNextProblem}
        onViewResults={() => setPhase('result')}
      />
    );
  }

  // Final result phase
  if (phase === 'result' && problemResults.length > 0) {
    const totalAccuracy =
      problemResults.reduce((sum, r) => sum + r.accuracy, 0) / problemResults.length;
    const totalCorrect = problemResults.reduce((sum, r) => sum + r.correctPieces, 0);
    const totalPieces = problemResults.reduce((sum, r) => sum + r.totalPieces, 0);

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
        }}
      />
    );
  }

  return null;
}
