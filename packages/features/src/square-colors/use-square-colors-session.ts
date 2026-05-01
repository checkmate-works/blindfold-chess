"use client";

import { useCallback, useEffect, useRef } from "react";

import { useTimedSession } from "../practice-session/use-timed-session";
import { computePracticeResult } from "../common/practice-result";
import { generateSquareSequence } from "../common/utils";
import type { SquareColor, SquareColorsResult } from "./types";
import { getSquareColor } from "./logic";

export type UseSquareColorsSessionConfig = {
  timeLimit: number;
  onComplete?: (result: SquareColorsResult) => void;
  onAnswerEffect?: (correct: boolean) => void;
  mistakeAllowance?: number;
};

export type UseSquareColorsSessionReturn = {
  currentSquare: string | null;
  countdown: number | null;
  timeElapsed: number;
  timeRemaining: number;
  correctCount: number;
  incorrectCount: number;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  isFinished: boolean;
  isPaused: boolean;
  handleAnswer: (selectedColor: SquareColor) => void;
  togglePause: () => void;
};

export function useSquareColorsSession({
  timeLimit,
  onComplete,
  onAnswerEffect,
  mistakeAllowance,
}: UseSquareColorsSessionConfig): UseSquareColorsSessionReturn {
  const squaresRef = useRef<string[]>(generateSquareSequence(200));
  const indexRef = useRef(0);
  const questionTimesRef = useRef<number[]>([]);
  // per-question timing — useTimedSession tracks session-wide elapsed time only
  const questionStartRef = useRef<number>(Date.now());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const generateQuestion = useCallback((): string => {
    questionTimesRef.current.push(
      // per-question timing — useTimedSession tracks session-wide elapsed time only
      (Date.now() - questionStartRef.current) / 1000,
    );
    questionStartRef.current = Date.now(); // per-question timing — useTimedSession tracks session-wide elapsed time only

    indexRef.current += 1;
    if (indexRef.current >= squaresRef.current.length - 10) {
      squaresRef.current = [
        ...squaresRef.current,
        ...generateSquareSequence(100),
      ];
    }
    return squaresRef.current[indexRef.current];
  }, []);

  const session = useTimedSession<string>({
    timeLimit,
    generateQuestion,
    onAnswerEffect,
    mistakeAllowance,
  });

  const { correctCount, incorrectCount, timeElapsed, isFinished } = session;

  useEffect(() => {
    if (!isFinished) return;

    const result: SquareColorsResult = computePracticeResult(
      correctCount,
      incorrectCount,
      timeElapsed,
      timeLimit,
      questionTimesRef.current,
    );

    onCompleteRef.current?.(result);
  }, [isFinished, correctCount, incorrectCount, timeElapsed, timeLimit]);

  const { handleAnswer: sessionHandleAnswer, currentQuestion } = session;

  const handleAnswer = useCallback(
    (selectedColor: SquareColor) => {
      if (!currentQuestion) return;
      const correctColor = getSquareColor(currentQuestion);
      sessionHandleAnswer(selectedColor === correctColor);
    },
    [currentQuestion, sessionHandleAnswer],
  );

  return {
    currentSquare: currentQuestion,
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
    togglePause: session.togglePause,
  };
}
