'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { QuitConfirmModal } from '@/app/[locale]/practice/_components/QuitConfirmModal';
import { calculateAccuracy } from '@/app/[locale]/practice/_lib/accuracy';
import type { PositionAccuracy, PositionData } from '@/app/[locale]/practice/_lib/types';

import { PracticeResultSkeleton } from '../../_components/PracticeResultSkeleton';
import { getFenPositions } from '../_data/positions';
import { FenProblemResult } from './FenProblemResult';
import { FenRecreate } from './FenRecreate';
import { TUTORIAL_SKIPPED_KEY } from './TutorialSkipLink';

type GamePhase = 'recreate' | 'problem-result' | 'result';

type Props = {
  locale: Locale;
  problemCount: number;
  shuffle: boolean;
  isTutorial?: boolean;
  customFen?: string;
  fens?: string[];
};

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function FenSession({
  locale,
  problemCount,
  shuffle,
  isTutorial = false,
  customFen,
  fens,
}: Props) {
  const t = useTranslations('practice.fen');

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

  // Initialize positions
  const [positions, setPositions] = useState<PositionData[]>([]);

  // Initialize positions after mount
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);

      // If customFen is provided (e.g., from tutorial), use it directly
      if (customFen) {
        const isBlackToMove = customFen.includes(' b ');
        setPositions([{ fen: customFen, isBlackToMove }]);
        return;
      }

      // If fens are provided from URL params, use them
      if (fens && fens.length > 0) {
        let fenPositions = fens.map((fen) => {
          const isBlackToMove = fen.includes(' b ');
          return { fen, isBlackToMove };
        });

        // Shuffle if needed
        if (shuffle) {
          fenPositions = shuffleArray(fenPositions);
        }

        // Limit to problemCount
        fenPositions = fenPositions.slice(0, problemCount);

        setPositions(fenPositions);
        return;
      }

      // Fallback to default positions
      let fenPositions = getFenPositions();

      // Shuffle if needed
      if (shuffle) {
        fenPositions = shuffleArray(fenPositions);
      }

      // Limit to problemCount
      fenPositions = fenPositions.slice(0, problemCount);

      setPositions(fenPositions);
    }
  }, [hasMounted, problemCount, shuffle, customFen, fens]);

  // Scroll to session element after mount
  useEffect(() => {
    if (!hasMounted) return;

    // Tiny delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById('fen-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, [hasMounted]);

  // Game state
  const [phase, setPhase] = useState<GamePhase>('recreate');
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [recreatedPosition, setRecreatedPosition] = useState('8/8/8/8/8/8/8/8 w - - 0 1');
  const [currentAccuracy, setCurrentAccuracy] = useState<PositionAccuracy | null>(null);
  const [problemResults, setProblemResults] = useState<Map<number, PositionAccuracy>>(new Map());
  const [recreatedPositions, setRecreatedPositions] = useState<Map<number, string>>(new Map());
  const [skippedProblems, setSkippedProblems] = useState<Set<number>>(new Set());
  const [showQuitModal, setShowQuitModal] = useState(false);

  // Derive originalPosition from positions and currentProblemIndex
  const originalPosition = useMemo<PositionData | null>(() => {
    return positions[currentProblemIndex] || null;
  }, [positions, currentProblemIndex]);

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

    setPhase('problem-result');
  }, [originalPosition, recreatedPosition, currentProblemIndex, t, getScoreDescription]);

  const handleSkip = useCallback(() => {
    setSkippedProblems((prev) => new Set(prev).add(currentProblemIndex));

    const nextIndex = currentProblemIndex + 1;

    if (nextIndex < positions.length) {
      setCurrentProblemIndex(nextIndex);
      setRecreatedPosition('8/8/8/8/8/8/8/8 w - - 0 1');
      setCurrentAccuracy(null);
      setPhase('recreate');
    } else {
      setPhase('result');
    }
  }, [currentProblemIndex, positions]);

  const handleNextProblem = useCallback(() => {
    const nextIndex = currentProblemIndex + 1;
    setCurrentProblemIndex(nextIndex);
    setRecreatedPosition('8/8/8/8/8/8/8/8 w - - 0 1');
    setCurrentAccuracy(null);
    setPhase('recreate');
  }, [currentProblemIndex]);

  const handlePlayAgain = useCallback(() => {
    if (isTutorial) {
      localStorage.setItem(TUTORIAL_SKIPPED_KEY, 'true');
    }
    // Always navigate to setup page
    window.location.href = `/${locale}/practice/fen`;
  }, [isTutorial, locale]);

  const handleQuitClick = useCallback(() => {
    setShowQuitModal(true);
  }, []);

  const handleQuitConfirm = useCallback(() => {
    setShowQuitModal(false);
    setPhase('result');
  }, []);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
  }, []);

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

  // Wait for positions to be initialized
  if (!hasMounted || positions.length === 0) {
    return null;
  }

  // Recreate phase
  if (phase === 'recreate' && originalPosition) {
    return (
      <>
        <div id="fen-session" className="min-h-screen">
          <FenRecreate
            originalPosition={originalPosition}
            recreatedPosition={recreatedPosition}
            currentProblemIndex={currentProblemIndex}
            problemCount={positions.length}
            boardTheme={preferences.boardTheme}
            showCoordinates={preferences.showCoordinates}
            isTutorial={isTutorial}
            onPositionChange={setRecreatedPosition}
            onSubmit={handleSubmit}
            onSkip={handleSkip}
            onQuit={handleQuitClick}
          />
        </div>
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
  if (phase === 'problem-result' && currentAccuracy && originalPosition) {
    return (
      <FenProblemResult
        accuracy={currentAccuracy}
        originalPosition={originalPosition}
        recreatedPosition={recreatedPosition}
        currentProblemIndex={currentProblemIndex}
        totalProblems={positions.length}
        boardTheme={preferences.boardTheme}
        showCoordinates={preferences.showCoordinates}
        isTutorial={isTutorial}
        onNextProblem={handleNextProblem}
        onViewResults={() => setPhase('result')}
        onFinishTutorial={handlePlayAgain}
      />
    );
  }

  // Final result phase
  if (phase === 'result') {
    const resultsArray = Array.from(problemResults.values());

    if (resultsArray.length === 0 && skippedProblems.size === 0) {
      const data = JSON.stringify({
        score: 0,
        total: 100,
        results: [],
        detailedStats: null,
      });
      const scoreText = `${t('accuracy')}: 0.0% (0/0)`;
      window.location.href = `/${locale}/practice/fen/result?data=${encodeURIComponent(data)}&scoreText=${encodeURIComponent(scoreText)}`;
      return <PracticeResultSkeleton />;
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

    const individualResults = positions.map((position, index) => {
      const result = problemResults.get(index);
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

    const detailedStats = {
      correctPieces: totalCorrect,
      totalPieces,
      incorrectPieces: totalIncorrect,
      missingPieces: totalMissing,
      extraPieces: totalExtra,
    };

    const data = JSON.stringify({
      score: Math.round(totalAccuracy),
      total: 100,
      results: individualResults,
      detailedStats,
    });

    const scoreText = `${t('accuracy')}: ${totalAccuracy.toFixed(1)}% (${totalCorrect}/${totalPieces})`;

    window.location.href = `/${locale}/practice/fen/result?data=${encodeURIComponent(data)}&scoreText=${encodeURIComponent(scoreText)}`;
    return <PracticeResultSkeleton />;
  }

  return <PracticeResultSkeleton />;
}
