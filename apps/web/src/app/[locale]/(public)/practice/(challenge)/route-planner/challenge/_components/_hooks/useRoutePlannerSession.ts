'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { useTimedSession } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-timed-session';
import { saveRoutePlannerResult } from '@/app/[locale]/(public)/practice/(challenge)/route-planner/_actions/save-result';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PIECES, generateProblem } from '../../../_lib/utils';
import type { PieceType } from '../../../_lib/utils';

export type ProblemResult = {
  piece: PieceType;
  start: string;
  end: string;
  success: boolean;
  userPath: string[];
  shortestPath: string[];
};

type UseRoutePlannerSessionParams = {
  locale: Locale;
  initialTimeLimit: number;
  allowedPieces: PieceType[];
};

/**
 * Owns the timed-session + challenge-result-save flow for route planner.
 *
 * Per-problem state (moves history, last-answer marker, staged coordinate
 * selection) lives inside the body component which is remounted via
 * `key={problemKey}` — this replaces the old `prevProblemRef` useEffect
 * reset pattern with a React-native identity-reset strategy.
 */
export function useRoutePlannerSession({
  locale,
  initialTimeLimit,
  allowedPieces,
}: UseRoutePlannerSessionParams) {
  const router = useRouter();

  const [problemResults, setProblemResults] = useState<ProblemResult[]>([]);
  const [showQuitModal, setShowQuitModal] = useState(false);

  const piecesForGeneration = useMemo(
    () => (allowedPieces.length > 0 ? allowedPieces : [...PIECES]),
    [allowedPieces]
  );

  const generateQuestion = useCallback((): {
    piece: PieceType;
    start: string;
    end: string;
  } => {
    return generateProblem(piecesForGeneration);
  }, [piecesForGeneration]);

  const session = useTimedSession<{ piece: PieceType; start: string; end: string }>({
    timeLimit: initialTimeLimit,
    generateQuestion,
    mistakeAllowance: MISTAKE_LIMIT,
    feedbackDuration: (correct: boolean) => (correct ? 1000 : 2000),
  });

  const {
    currentQuestion: currentProblem,
    timeRemaining,
    totalTime,
    correctCount,
    incorrectCount,
    showFeedback,
    isFinished,
    countdown,
    isPaused,
    handleAnswer: hookHandleAnswer,
    togglePause,
  } = session;

  useScrollToElement('route-planner-challenge-session');

  const timeElapsed = initialTimeLimit - timeRemaining;
  const isDisabled = showFeedback || isPaused || countdown !== null;

  const recordProblemResult = useCallback((result: ProblemResult) => {
    setProblemResults((prev) => [...prev, result]);
  }, []);

  const handleQuitRequest = useCallback(() => {
    if (!isPaused) togglePause();
    setShowQuitModal(true);
  }, [isPaused, togglePause]);

  const handleQuitConfirm = useCallback(() => {
    router.push(`/${locale}/practice/route-planner/challenge`);
  }, [router, locale]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
    if (isPaused) togglePause();
  }, [isPaused, togglePause]);

  const total = correctCount + incorrectCount;
  const resultUrl = useMemo(() => {
    const dataStr = encodeURIComponent(JSON.stringify(problemResults));
    const piecesStr = allowedPieces.join('');

    const params = new URLSearchParams();
    params.set('data', dataStr);
    params.set('mode', 'standard');
    params.set('count', total.toString());
    params.set('pieces', piecesStr);
    params.set('time', timeElapsed.toString());
    if (allowedPieces.length === 1) {
      const pieceName = allowedPieces[0] === 'n' ? 'knight' : 'bishop';
      params.set('piece', pieceName);
    }

    return `/${locale}/practice/route-planner/result?${params.toString()}`;
  }, [problemResults, allowedPieces, total, locale, timeElapsed]);

  const pieceName = useMemo(() => {
    if (allowedPieces.length === 1) {
      return allowedPieces[0] === 'n' ? 'knight' : 'bishop';
    }
    return 'knight'; // fallback, challenge mode always uses single piece
  }, [allowedPieces]);

  const saveResult = useCallback(
    () =>
      saveRoutePlannerResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: totalTime,
        piece: pieceName,
      }),
    [correctCount, incorrectCount, totalTime, pieceName]
  );

  useChallengeResultSave({
    isFinished,
    totalAnswers: total,
    resultUrl,
    saveResult,
    moduleName: 'route_planner',
  });

  return {
    currentProblem,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    isFinished,
    countdown,
    isPaused,
    timeElapsed,
    isDisabled,
    hookHandleAnswer,
    togglePause,
    recordProblemResult,
    showQuitModal,
    handleQuitRequest,
    handleQuitConfirm,
    handleQuitCancel,
  };
}
