"use client";

import { useEffect, useRef } from "react";

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
