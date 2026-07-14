"use client";

import { useCallback } from "react";

import { generateSquareSequence } from "../common/utils";
import { useBufferedQuestions } from "../practice-session/use-buffered-questions";
import { useTimedPracticeCompletion } from "../practice-session/use-practice-completion";
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
  const generateQuestion = useBufferedQuestions((count) =>
    generateSquareSequence(count),
  );

  const session = useTimedSession<string>({
    timeLimit,
    generateQuestion,
    onAnswerEffect,
    mistakeAllowance,
  });

  useTimedPracticeCompletion(session, timeLimit, onComplete);

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
