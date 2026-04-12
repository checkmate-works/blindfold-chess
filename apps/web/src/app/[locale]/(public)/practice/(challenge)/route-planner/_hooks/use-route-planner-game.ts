import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { type PieceType, findShortestPath, generateProblem, validateUserPath } from '../_lib/utils';
import type { StagedCoordinate } from './use-staged-coordinate';

type GameState = 'playing' | 'result';

type RoutePlannerResult = {
  piece: PieceType;
  start: string;
  end: string;
  success: boolean;
  userPath: string[];
  shortestPath: string[];
  skipped?: boolean;
};

type ResultState = {
  success: boolean;
  shortestPath: string[];
  message?: string;
  skipped?: boolean;
};

type Options = {
  locale: string;
  allowedPieces: PieceType[];
  mode: 'training';
  /** Injected staged-coordinate state controller. */
  stagedCoordinate: StagedCoordinate;
};

export function useRoutePlannerGame({ locale, allowedPieces, mode, stagedCoordinate }: Options) {
  const t = useTranslations('practice.routePlanner');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const { showToast } = useToast();

  const [gameState, setGameState] = useState<GameState>('playing');
  const [results, setResults] = useState<RoutePlannerResult[]>([]);

  const [problem, setProblem] = useState<{
    piece: PieceType;
    start: string;
    end: string;
  } | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [result, setResult] = useState<ResultState | null>(null);

  const { resetStage } = stagedCoordinate;

  const startNewProblem = useCallback(() => {
    const newProblem = generateProblem(allowedPieces);
    setProblem(newProblem);
    setMoves([]);
    setGameState('playing');
    setResult(null);
    resetStage();
  }, [allowedPieces, resetStage]);

  // Initialize first problem on mount
  useEffect(() => {
    if (!problem && gameState === 'playing') {
      startNewProblem();
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useScrollToElement('route-planner-session', true);

  const addMove = useCallback(
    (square: string) => {
      if (!problem) return;
      setMoves((prev) => [...prev, square]);
    },
    [problem]
  );

  const handleUndo = useCallback(() => {
    if (moves.length === 0 || !problem) return;
    setMoves(moves.slice(0, -1));
    resetStage();
  }, [moves, problem, resetStage]);

  const handleFilePress = useCallback(
    (file: string) => {
      const next = stagedCoordinate.pressFile(file);
      if (next.selectedFile !== null && next.selectedRank !== null) {
        addMove(`${next.selectedFile}${next.selectedRank}`);
        stagedCoordinate.resetStage();
      }
    },
    [stagedCoordinate, addMove]
  );

  const handleRankPress = useCallback(
    (rank: string) => {
      const next = stagedCoordinate.pressRank(rank);
      if (next.selectedFile !== null && next.selectedRank !== null) {
        addMove(`${next.selectedFile}${next.selectedRank}`);
        stagedCoordinate.resetStage();
      }
    },
    [stagedCoordinate, addMove]
  );

  const handleBackspace = useCallback(() => {
    if (stagedCoordinate.clearStage()) return;
    if (moves.length > 0) handleUndo();
  }, [stagedCoordinate, moves.length, handleUndo]);

  const handleSubmitAnswer = useCallback(() => {
    if (!problem) return;

    const finalMoves = [...moves];
    if (finalMoves.length > 0 && finalMoves[finalMoves.length - 1] !== problem.end) {
      finalMoves.push(problem.end);
    } else if (finalMoves.length === 0) {
      finalMoves.push(problem.end);
    }

    const validation = validateUserPath(problem.piece, problem.start, finalMoves, problem.end);
    const shortestPath = findShortestPath(problem.piece, problem.start, problem.end) || [];

    if (validation.valid) {
      setResult({ success: true, shortestPath, message: t('correct'), skipped: false });
    } else {
      setResult({
        success: false,
        shortestPath,
        message: validation.error === 'Path does not end at goal' ? t('badEnd') : t('incorrect'),
        skipped: false,
      });
    }

    setMoves(finalMoves);
    setGameState('result');
  }, [problem, moves, t]);

  const handleSkip = useCallback(() => {
    if (!problem) return;
    const shortestPath = findShortestPath(problem.piece, problem.start, problem.end) || [];
    setResult({ success: false, shortestPath, message: t('skipped'), skipped: true });
    setGameState('result');
  }, [problem, t]);

  const handleNextProblem = useCallback(() => {
    const newResults = [...results];
    if (result && problem) {
      newResults.push({
        piece: problem.piece,
        start: problem.start,
        end: problem.end,
        success: result.success,
        userPath: result.skipped === true ? [] : moves,
        shortestPath: result.shortestPath,
        skipped: result.skipped === true,
      });
      setResults(newResults);
    }

    startNewProblem();
  }, [result, startNewProblem, problem, moves, results]);

  const handleEndTraining = useCallback(() => {
    showToast(tPractice('trainingEnded'), 'info');
    router.push(`/${locale}/practice/route-planner`);
  }, [showToast, tPractice, router, locale]);

  return {
    gameState,
    results,
    problem,
    moves,
    result,
    handleFilePress,
    handleRankPress,
    handleBackspace,
    handleUndo,
    handleSubmitAnswer,
    handleSkip,
    handleNextProblem,
    handleEndTraining,
  };
}
