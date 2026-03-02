import { useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import {
  PIECES,
  type PieceType,
  findShortestPath,
  generateProblem,
  validateUserPath,
} from '../_lib/utils';

type GameState = 'playing' | 'result' | 'summary';

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
};

type Options = {
  locale: string;
  problemCount: number;
  allowedPieces: PieceType[];
  mode: 'standard' | 'tutorial' | 'training';
  initialProblem?: {
    piece: PieceType;
    start: string;
    end: string;
  };
  resetInput: () => void;
};

export function useRoutePlannerGame({
  locale,
  problemCount,
  allowedPieces,
  mode,
  initialProblem,
  resetInput,
}: Options) {
  const t = useTranslations('practice.routePlanner');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const { showToast } = useToast();

  const isTraining = mode === 'training';

  const [gameState, setGameState] = useState<GameState>('playing');
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [results, setResults] = useState<RoutePlannerResult[]>([]);

  const [problem, setProblem] = useState<{
    piece: PieceType;
    start: string;
    end: string;
  } | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [result, setResult] = useState<ResultState | null>(null);

  const startNewProblem = useCallback(() => {
    let newProblem;
    if (mode === 'tutorial' && initialProblem && currentProblemIndex === 0) {
      newProblem = initialProblem;
    } else {
      newProblem = generateProblem(allowedPieces);
    }

    setProblem(newProblem);
    setMoves([]);
    setGameState('playing');
    setResult(null);
    resetInput();
  }, [allowedPieces, resetInput, mode, initialProblem, currentProblemIndex]);

  // Initialize first problem on mount
  useEffect(() => {
    if (!problem && gameState === 'playing') {
      startNewProblem();
    }

    const timer = setTimeout(() => {
      const element = document.getElementById('route-planner-session');
      if (element && (mode === 'standard' || mode === 'training')) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

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
    resetInput();
  }, [moves, problem, resetInput]);

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
      setResult({ success: true, shortestPath, message: t('correct') });
    } else {
      setResult({
        success: false,
        shortestPath,
        message: validation.error === 'Path does not end at goal' ? t('badEnd') : t('incorrect'),
      });
    }

    setMoves(finalMoves);
    setGameState('result');
  }, [problem, moves, t]);

  const handleSkip = useCallback(() => {
    if (!problem) return;
    const shortestPath = findShortestPath(problem.piece, problem.start, problem.end) || [];
    setResult({ success: false, shortestPath, message: t('skipped') });
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
        userPath: result.message === t('skipped') ? [] : moves,
        shortestPath: result.shortestPath,
        skipped: result.message === t('skipped'),
      });
      setResults(newResults);
    }

    if (isTraining) {
      setCurrentProblemIndex((prev) => prev + 1);
      startNewProblem();
      return;
    }

    const nextIndex = currentProblemIndex + 1;
    if (nextIndex < problemCount) {
      setCurrentProblemIndex(nextIndex);
      startNewProblem();
    } else {
      const dataStr = encodeURIComponent(JSON.stringify(newResults));
      const piecesStr = allowedPieces.join('');
      router.push(
        `/${locale}/practice/route-planner/result?data=${dataStr}&mode=${mode}&count=${problemCount}&pieces=${piecesStr}`
      );
    }
  }, [
    currentProblemIndex,
    problemCount,
    result,
    startNewProblem,
    problem,
    t,
    moves,
    results,
    router,
    locale,
    mode,
    allowedPieces,
    isTraining,
  ]);

  const handleEndTraining = useCallback(() => {
    showToast(tPractice('trainingEnded'), 'info');
    router.push(`/${locale}/practice/route-planner`);
  }, [showToast, tPractice, router, locale]);

  const confirmQuit = useCallback(() => {
    const finalResults = [...results];
    if (gameState === 'result' && result && problem) {
      finalResults.push({
        piece: problem.piece,
        start: problem.start,
        end: problem.end,
        success: result.success,
        userPath: result.message === t('skipped') ? [] : moves,
        shortestPath: result.shortestPath,
        skipped: result.message === t('skipped'),
      });
      setResults(finalResults);
    }

    const dataStr = encodeURIComponent(JSON.stringify(finalResults));
    const piecesStr = allowedPieces.join('');
    router.push(
      `/${locale}/practice/route-planner/result?data=${dataStr}&mode=${mode}&count=${problemCount}&pieces=${piecesStr}`
    );
  }, [
    gameState,
    result,
    problem,
    moves,
    t,
    results,
    router,
    locale,
    mode,
    problemCount,
    allowedPieces,
  ]);

  return {
    gameState,
    currentProblemIndex,
    results,
    problem,
    moves,
    result,
    isTraining,
    addMove,
    handleUndo,
    handleSubmitAnswer,
    handleSkip,
    handleNextProblem,
    handleEndTraining,
    confirmQuit,
  };
}

export { PIECES };
export type { PieceType, GameState, RoutePlannerResult };
