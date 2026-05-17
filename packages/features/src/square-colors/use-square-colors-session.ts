"use client";

import { useCallback, useRef } from "react";

import { computePracticeResult } from "../common/practice-result";
import { generateSquareSequence } from "../common/utils";
import { usePracticeCompletion } from "../practice-session/use-practice-completion";
import {
  type TimedQuizSessionConfig,
  type TimedSessionFacade,
  toTimedSessionFacade,
} from "../practice-session/quiz-session";
import { useTimedSession } from "../practice-session/use-timed-session";
import type { SquareColor, SquareColorsResult } from "./types";
import { getSquareColor } from "./logic";

export type UseSquareColorsSessionConfig =
  TimedQuizSessionConfig<SquareColorsResult>;

export type UseSquareColorsSessionReturn = TimedSessionFacade & {
  currentSquare: string | null;
  handleAnswer: (selectedColor: SquareColor) => void;
};

export function useSquareColorsSession({
  timeLimit,
  onComplete,
  onAnswerEffect,
  mistakeAllowance,
}: UseSquareColorsSessionConfig): UseSquareColorsSessionReturn {
  const squaresRef = useRef<string[]>(generateSquareSequence(200));
  const indexRef = useRef(0);

  const generateQuestion = useCallback((): string => {
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

  usePracticeCompletion(
    isFinished,
    (): SquareColorsResult =>
      computePracticeResult(
        correctCount,
        incorrectCount,
        timeElapsed,
        timeLimit,
        session.questionTimes,
      ),
    onComplete,
  );

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
    ...toTimedSessionFacade(session),
    currentSquare: currentQuestion,
    handleAnswer,
  };
}
