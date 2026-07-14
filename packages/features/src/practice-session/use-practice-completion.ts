"use client";

import { useEffect, useRef } from "react";

import { computePracticeResult } from "../common/practice-result";
import type { PracticeResultWithMistakes } from "../common/types";

/**
 * Fires `onComplete` exactly once, with a freshly computed result, when a
 * session transitions to finished.
 *
 * `computeResult` is read through a ref so the latest closure — capturing the
 * final answer counts of the render in which the session finished — is used
 * without widening the effect's dependency list to those counts.
 */
export function usePracticeCompletion<TResult>(
  isFinished: boolean,
  computeResult: () => TResult,
  onComplete: ((result: TResult) => void) | undefined,
): void {
  const computeResultRef = useRef(computeResult);
  computeResultRef.current = computeResult;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isFinished) return;
    onCompleteRef.current?.(computeResultRef.current());
  }, [isFinished]);
}

/** Fields of a `useTimedSession` return value consumed by {@link useTimedPracticeCompletion}. */
type TimedCompletionSource = {
  correctCount: number;
  incorrectCount: number;
  timeElapsed: number;
  isFinished: boolean;
  questionTimes: number[];
};

/**
 * The standard completion wiring shared by the timed quiz session hooks:
 * fires `onComplete` exactly once, with `computePracticeResult(...)` over the
 * session's final counts, when the session finishes. Hooks with a custom
 * result shape (e.g. route planner) use `usePracticeCompletion` directly.
 */
export function useTimedPracticeCompletion(
  session: TimedCompletionSource,
  timeLimit: number,
  onComplete: ((result: PracticeResultWithMistakes) => void) | undefined,
): void {
  const {
    correctCount,
    incorrectCount,
    timeElapsed,
    isFinished,
    questionTimes,
  } = session;
  usePracticeCompletion(
    isFinished,
    () =>
      computePracticeResult(
        correctCount,
        incorrectCount,
        timeElapsed,
        timeLimit,
        questionTimes,
      ),
    onComplete,
  );
}
