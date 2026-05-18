"use client";

import { useCallback, useRef } from "react";

import type { Square } from "@blindfold-chess/types";

import { FEEDBACK_FLASH_MS } from "../common/flash-policy";
import { usePracticeCompletion } from "../practice-session/use-practice-completion";
import {
  type TimedQuizSessionConfig,
  type TimedSessionFacade,
  toTimedSessionFacade,
} from "../practice-session/quiz-session";
import { useTimedSession } from "../practice-session/use-timed-session";
import { findShortestPath, generateProblem } from "./logic";
import type {
  RoutePlannerPieceType,
  RoutePlannerProblem,
  RoutePlannerProblemResult,
  RoutePlannerResult,
} from "./types";

export type UseRoutePlannerSessionConfig =
  TimedQuizSessionConfig<RoutePlannerResult> & {
    selectedPieces: RoutePlannerPieceType[];
    /** If set, session also ends when total answers reach this count. */
    problemCount?: number;
    onSkipEffect?: () => void;
  };

export type UseRoutePlannerSessionReturn = TimedSessionFacade & {
  currentProblem: RoutePlannerProblem | null;
  handleAnswer: (success: boolean) => void;
  handleSkip: () => void;
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
  const onSkipEffectRef = useRef(onSkipEffect);
  onSkipEffectRef.current = onSkipEffect;

  const generateQuestion = useCallback(
    (): RoutePlannerProblem => generateProblem(selectedPieces),
    [selectedPieces],
  );

  const session = useTimedSession<RoutePlannerProblem>({
    timeLimit,
    generateQuestion,
    feedbackDuration: (correct: boolean) =>
      correct ? FEEDBACK_FLASH_MS.correct : FEEDBACK_FLASH_MS.incorrect,
    mistakeAllowance,
    onAnswerEffect,
  });

  const { correctCount, incorrectCount, isFinished: timerFinished } = session;

  const isCountFinished =
    problemCount !== undefined && correctCount + incorrectCount >= problemCount;

  const isFinished = timerFinished || isCountFinished;

  usePracticeCompletion(
    isFinished,
    (): RoutePlannerResult => {
      const total = correctCount + incorrectCount;
      return {
        problems: problemResultsRef.current,
        totalProblems: total,
        correctCount,
        accuracy: total > 0 ? (correctCount / total) * 100 : 0,
      };
    },
    onComplete,
  );

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
    ...toTimedSessionFacade(session),
    isFinished,
    currentProblem: currentQuestion,
    handleAnswer,
    handleSkip,
  };
}
