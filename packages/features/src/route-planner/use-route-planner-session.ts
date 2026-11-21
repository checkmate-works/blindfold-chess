"use client";

import { useCallback, useRef } from "react";

import type { Square } from "@blindfold-chess/types";

import { flashFeedbackDuration } from "../common/flash-policy";
import { calculateAnswerAccuracy } from "../common/practice-result";
import { useLatestRef } from "../common/use-latest-ref";
import { usePracticeCompletion } from "../practice-session/use-practice-completion";
import {
  type TimedQuizSessionConfig,
  type TimedSessionFacade,
  isInputBlocked,
  toTimedSessionFacade,
} from "../practice-session/quiz-session";
import { useTimedSession } from "../practice-session/use-timed-session";
import type { RoutePlannerChallengeAnswer } from "./challenge";
import { findShortestPath, generateProblem } from "./logic";
import type {
  RoutePlannerPieceType,
  RoutePlannerProblem,
  RoutePlannerProblemResult,
  RoutePlannerResult,
} from "./types";

export type UseRoutePlannerSessionConfig = TimedQuizSessionConfig<
  RoutePlannerResult,
  RoutePlannerProblem
> & {
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
   * recorded entry carries an empty path. In a remote session the path is
   * also what the server grades, so a remote caller must pass it: an omitted
   * path is sent as an empty one, i.e. a direct start-to-goal move.
   */
  handleAnswer: (success: boolean, userPath?: readonly Square[]) => void;
  handleSkip: () => void;
};

/**
 * Timed route-planner session. Ends on the timer, the mistake allowance, or
 * — when `problemCount` is set — once that many problems are answered; the
 * last case leaves `finishReason` `null`. A skip is recorded as an incorrect
 * answer (`skipped: true`), so it counts toward both the mistake allowance
 * and `problemCount`. The result's `problems` never include a `timedOut`
 * entry; callers that want one append it themselves.
 */
export function useRoutePlannerSession({
  selectedPieces,
  timeLimit,
  mistakeAllowance,
  problemCount,
  onComplete,
  onAnswerEffect,
  onSkipEffect,
  remote,
  disablePause,
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
    remote,
    disablePause,
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
        // The core rolls back a remote answer rejected at the deadline.
        problems: problemResultsRef.current.slice(0, total),
        totalProblems: total,
        correctCount,
        accuracy: calculateAnswerAccuracy(correctCount, total),
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
      const answer: RoutePlannerChallengeAnswer = { path: [...userPath] };
      sessionHandleAnswer(success, answer);
    },
    [isBlocked, currentQuestion, recordProblem, sessionHandleAnswer],
  );

  const handleSkip = useCallback(() => {
    if (isBlocked || !currentQuestion) return;

    onSkipEffectRef.current?.();
    recordProblem(currentQuestion, false, [], true);
    const answer: RoutePlannerChallengeAnswer = { skipped: true };
    sessionHandleAnswer(false, answer);
  }, [isBlocked, currentQuestion, recordProblem, sessionHandleAnswer]);

  return {
    ...toTimedSessionFacade(session),
    isFinished,
    currentProblem: currentQuestion,
    handleAnswer,
    handleSkip,
  };
}
