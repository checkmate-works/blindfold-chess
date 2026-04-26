"use client";

import { useCallback, useEffect, useRef } from "react";

import type { Square } from "@blindfold-chess/types";

import { FEEDBACK_FLASH_MS } from "../common/flash-policy";
import { useTimedSession } from "../practice-session/use-timed-session";
import { findShortestPath, generateProblem } from "./logic";
import type {
  RoutePlannerPieceType,
  RoutePlannerProblem,
  RoutePlannerProblemResult,
  RoutePlannerResult,
} from "./types";

export type UseRoutePlannerSessionConfig = {
  selectedPieces: RoutePlannerPieceType[];
  timeLimit: number;
  mistakeAllowance?: number;
  /** If set, session also ends when total answers reach this count. */
  problemCount?: number;
  onComplete?: (result: RoutePlannerResult) => void;
  onAnswerEffect?: (correct: boolean) => void;
  onSkipEffect?: () => void;
};

export type UseRoutePlannerSessionReturn = {
  currentProblem: RoutePlannerProblem | null;
  countdown: number | null;
  timeElapsed: number;
  timeRemaining: number;
  correctCount: number;
  incorrectCount: number;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  isFinished: boolean;
  isPaused: boolean;
  handleAnswer: (success: boolean) => void;
  handleSkip: () => void;
  togglePause: () => void;
};

export function useRoutePlannerSession({
  selectedPieces,
  timeLimit,
  mistakeAllowance,
  problemCount,
  onComplete,
  onAnswerEffect,
  onSkipEffect,
}: UseRoutePlannerSessionConfig): UseRoutePlannerSessionReturn {
  const problemResultsRef = useRef<RoutePlannerProblemResult[]>([]);
  // per-question timing — useTimedSession tracks session-wide elapsed time only
  const questionStartRef = useRef<number>(Date.now());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onSkipEffectRef = useRef(onSkipEffect);
  onSkipEffectRef.current = onSkipEffect;

  const generateQuestion = useCallback((): RoutePlannerProblem => {
    // per-question timing — useTimedSession tracks session-wide elapsed time only
    questionStartRef.current = Date.now();
    return generateProblem(selectedPieces);
  }, [selectedPieces]);

  const session = useTimedSession<RoutePlannerProblem>({
    timeLimit,
    generateQuestion,
    feedbackDuration: (correct: boolean) =>
      correct ? FEEDBACK_FLASH_MS.correct : FEEDBACK_FLASH_MS.incorrect,
    mistakeAllowance,
    onAnswerEffect,
  });

  const {
    correctCount,
    incorrectCount,
    timeElapsed,
    isFinished: timerFinished,
  } = session;

  const isCountFinished =
    problemCount !== undefined && correctCount + incorrectCount >= problemCount;

  const isFinished = timerFinished || isCountFinished;

  useEffect(() => {
    if (!isFinished) return;

    const total = correctCount + incorrectCount;
    const accuracy = total > 0 ? (correctCount / total) * 100 : 0;

    const result: RoutePlannerResult = {
      problems: problemResultsRef.current,
      totalProblems: total,
      correctCount,
      accuracy,
    };

    onCompleteRef.current?.(result);
  }, [isFinished, correctCount, incorrectCount]);

  const { handleAnswer: sessionHandleAnswer, currentQuestion } = session;

  const isBlocked =
    isFinished ||
    session.countdown !== null ||
    session.isPaused ||
    session.showFeedback;

  const handleAnswer = useCallback(
    (success: boolean) => {
      if (isBlocked || !currentQuestion) return;

      const shortestPath =
        (findShortestPath(
          currentQuestion.piece,
          currentQuestion.start,
          currentQuestion.end,
        ) as Square[] | null) ?? [];

      problemResultsRef.current = [
        ...problemResultsRef.current,
        {
          piece: currentQuestion.piece,
          start: currentQuestion.start,
          end: currentQuestion.end,
          success,
          userPath: [],
          shortestPath,
        },
      ];

      sessionHandleAnswer(success);
    },
    [isBlocked, currentQuestion, sessionHandleAnswer],
  );

  const handleSkip = useCallback(() => {
    if (isBlocked || !currentQuestion) return;

    onSkipEffectRef.current?.();

    const shortestPath =
      (findShortestPath(
        currentQuestion.piece,
        currentQuestion.start,
        currentQuestion.end,
      ) as Square[] | null) ?? [];

    problemResultsRef.current = [
      ...problemResultsRef.current,
      {
        piece: currentQuestion.piece,
        start: currentQuestion.start,
        end: currentQuestion.end,
        success: false,
        userPath: [],
        shortestPath,
        skipped: true,
      },
    ];

    sessionHandleAnswer(false);
  }, [isBlocked, currentQuestion, sessionHandleAnswer]);

  return {
    currentProblem: currentQuestion,
    countdown: session.countdown,
    timeElapsed,
    timeRemaining: session.timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback: session.showFeedback,
    lastAnswerCorrect: session.lastAnswerCorrect,
    isFinished,
    isPaused: session.isPaused,
    handleAnswer,
    handleSkip,
    togglePause: session.togglePause,
  };
}
