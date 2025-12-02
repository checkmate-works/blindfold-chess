'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeComplete } from '@/app/[locale]/practice/_components/PracticeComplete';

import type { GamePhase, PositionAccuracy, PositionData } from '../_lib/types';
import {
  calculateAccuracy,
  encodeFensToBase64,
  getCustomPositions,
  getRandomPositions,
} from '../_lib/utils';
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
          ? getCustomPositions(fens, problemCount, shuffle)
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
  const [problemResults, setProblemResults] = useState<Map<number, PositionAccuracy>>(new Map());
  const [recreatedPositions, setRecreatedPositions] = useState<Map<number, string>>(new Map());
  const [skippedProblems, setSkippedProblems] = useState<Set<number>>(new Set());
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
    setProblemResults((prev) => new Map(prev).set(currentProblemIndex, accuracy));
    setRecreatedPositions((prev) => new Map(prev).set(currentProblemIndex, recreatedPosition));

    // Always show problem-result phase first
    setPhase('problem-result');
  }, [originalPosition, recreatedPosition, currentProblemIndex, t, getScoreDescription]);

  const handleSkip = useCallback(() => {
    // Mark current problem as skipped
    setSkippedProblems((prev) => new Set(prev).add(currentProblemIndex));

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
    // For custom FEN, rebuild URL from localStorage to reflect any deletions
    if (fens && fens.length > 0) {
      try {
        const savedSettings = localStorage.getItem('positionMemorySettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          const customFenInput = settings.customFenInput ?? '';
          const updatedFens = customFenInput
            .trim()
            .split('\n')
            .filter((line: string) => line.trim());

          if (updatedFens.length > 0) {
            const params = new URLSearchParams();
            params.set('timeLimit', timeLimit.toString());
            params.set('shuffle', shuffle ? '1' : '0');
            params.set('problems', encodeFensToBase64(updatedFens));
            // Use problemCount, capped at the number of available FENs
            const effectiveCount = Math.min(problemCount, updatedFens.length);
            params.set('count', effectiveCount.toString());
            window.location.href = `/${locale}/practice/position-memory/session?${params.toString()}`;
            return;
          } else {
            // All FENs deleted, redirect to setup page
            window.location.href = `/${locale}/practice/position-memory`;
            return;
          }
        }
      } catch (error) {
        console.error('Failed to rebuild URL from localStorage:', error);
      }
    }

    // Fallback: simple reload
    window.location.reload();
  }, [fens, timeLimit, shuffle, locale, problemCount]);

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

  // Delete FEN from localStorage
  const handleDeleteFen = useCallback((fenToDelete: string) => {
    try {
      const savedSettings = localStorage.getItem('positionMemorySettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.customFenInput) {
          const fens = settings.customFenInput
            .trim()
            .split('\n')
            .filter((line: string) => line.trim());
          const updatedFens = fens.filter((fen: string) => fen.trim() !== fenToDelete.trim());
          settings.customFenInput = updatedFens.join('\n');
          localStorage.setItem('positionMemorySettings', JSON.stringify(settings));
        }
      }
    } catch (error) {
      console.error('Failed to delete FEN from localStorage:', error);
    }
  }, []);

  // Check if custom FEN is being used
  const isCustomFen = !!(fens && fens.length > 0);

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
