"use client";

import { useCallback, useEffect, useRef } from "react";

import { getCornerInfo } from "./logic";
import {
  type UseDiagonalInputReturn,
  useDiagonalInput,
} from "./use-diagonal-input";
import {
  type UseDiagonalQuizSessionConfig,
  type UseDiagonalQuizSessionReturn,
  useDiagonalQuizSession,
} from "./use-diagonal-quiz-session";

export type UseDiagonalQuizReturn = {
  session: UseDiagonalQuizSessionReturn;
  input: UseDiagonalInputReturn;
  /** Input is frozen during the pre-game countdown. */
  isDisabled: boolean;
  /** Whether the current square's diagonal is a single corner square. */
  singleDiagonal: boolean;
  /** Whether the current square's anti-diagonal is a single corner square. */
  singleAntiDiagonal: boolean;
};

/**
 * Composite screen hook for the diagonal quiz: wires the timed session and
 * the two-diagonal input together so screens are pure rendering. Owns the
 * cross-cutting glue that is easy to get wrong at the component level:
 *
 * - Corner squares have a single-square diagonal and/or anti-diagonal; the
 *   input hook must accept the single-square answer form for exactly those
 *   fields (`getCornerInfo`).
 * - Input submits are dropped during the countdown.
 * - The input is reset when the question advances (tracked via a previous-
 *   square ref so a re-render without an advance never wipes typing).
 */
export function useDiagonalQuiz(
  config: UseDiagonalQuizSessionConfig,
): UseDiagonalQuizReturn {
  const session = useDiagonalQuizSession(config);
  const { currentSquare, countdown, handleAnswer } = session;

  const isDisabled = countdown !== null;

  const { singleDiagonal, singleAntiDiagonal } = currentSquare
    ? getCornerInfo(currentSquare)
    : { singleDiagonal: false, singleAntiDiagonal: false };

  const onBothComplete = useCallback(
    (diagonal: string, antiDiagonal: string) => {
      if (isDisabled) return;
      handleAnswer(diagonal, antiDiagonal);
    },
    [isDisabled, handleAnswer],
  );

  const input = useDiagonalInput({
    onBothComplete,
    disabled: isDisabled,
    allowSingleSquareDiagonal: singleDiagonal,
    allowSingleSquareAntiDiagonal: singleAntiDiagonal,
  });

  // Reset input when the question advances.
  const { reset: resetInput } = input;
  const prevSquareRef = useRef(currentSquare);
  useEffect(() => {
    if (prevSquareRef.current !== currentSquare) {
      prevSquareRef.current = currentSquare;
      resetInput();
    }
  }, [currentSquare, resetInput]);

  return { session, input, isDisabled, singleDiagonal, singleAntiDiagonal };
}
