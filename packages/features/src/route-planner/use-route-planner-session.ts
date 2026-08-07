"use client";

import { useCallback, useRef } from "react";

import type { Square } from "@blindfold-chess/types";

import { flashFeedbackDuration } from "../common/flash-policy";
import { useLatestRef } from "../common/use-latest-ref";
import { usePracticeCompletion } from "../practice-session/use-practice-completion";
import {
  type TimedQuizSessionConfig,
  type TimedSessionFacade,
  isInputBlocked,
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
  /**
   * Record an answer. `userPath` is the square sequence the user entered;
   * when omitted (callers that track their own per-problem results) the
   * recorded entry carries an empty path.
   */
  handleAnswer: (success: boolean, userPath?: readonly Square[]) => void;
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
  const onSkipEffectRef = useLatestRef(onSkipEffect);

  const generateQuestion = useCallback(
    (): RoutePlannerProblem => generateProblem(selectedPieces),
    [selectedPieces],
  );

  const session = useTimedSession<RoutePlannerProblem>({
    timeLimit,
    generateQuestion,
    feedbackDuration: flashFeedbackDuration,
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

  // `isFinished` overrides the session's own flag to include the count limit.
  const isBlocked = isInputBlocked({ ...session, isFinished });

  // Shared result-push step for answers and skips: resolves the model path and
  // appends a problem-result entry. `skipped` is only written when true so
  // answered entries keep their shape (no `skipped: false` key).
  const recordProblem = useCallback(
    (
      problem: RoutePlannerProblem,
      success: boolean,
      userPath: readonly Square[],
      skipped = false,
    ) => {
      const shortestPath =
        (findShortestPath(problem.piece, problem.start, problem.end) as
          Square[] | null) ?? [];

      problemResultsRef.current = [
        ...problemResultsRef.current,
        {
          piece: problem.piece,
          start: problem.start,
          end: problem.end,
          success,
          userPath: [...userPath],
          shortestPath,
          ...(skipped ? { skipped: true } : {}),
        },
      ];
    },
    [],
  );

  const handleAnswer = useCallback(
    (success: boolean, userPath: readonly Square[] = []) => {
      if (isBlocked || !currentQuestion) return;

      recordProblem(currentQuestion, success, userPath);
      sessionHandleAnswer(success);
    },
    [isBlocked, currentQuestion, recordProblem, sessionHandleAnswer],
  );

  const handleSkip = useCallback(() => {
    if (isBlocked || !currentQuestion) return;

    onSkipEffectRef.current?.();
    recordProblem(currentQuestion, false, [], true);
    sessionHandleAnswer(false);
  }, [isBlocked, currentQuestion, recordProblem, sessionHandleAnswer]);

  return {
    ...toTimedSessionFacade(session),
    isFinished,
    currentProblem: currentQuestion,
    handleAnswer,
    handleSkip,
  };
}
