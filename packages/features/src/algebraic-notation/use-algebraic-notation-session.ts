"use client";

import { useCallback, useState } from "react";

import { isCorrectAnswer } from "./logic";
import type {
  AlgebraicNotationQuestion,
  AlgebraicNotationResult,
} from "./types";

export type UseAlgebraicNotationSessionConfig = {
  questions: readonly AlgebraicNotationQuestion[];
  /** Called by `next()` on the last question with the final score. */
  onComplete: (result: AlgebraicNotationResult) => void;
};

export type UseAlgebraicNotationSessionReturn = {
  question: AlgebraicNotationQuestion;
  currentIndex: number;
  total: number;
  /** The option picked for the current question, or `""` before answering. */
  selectedAnswer: string;
  /** True once an option is picked; further picks are ignored until `next()`. */
  answered: boolean;
  score: number;
  isLastQuestion: boolean;
  selectOption: (option: string) => void;
  /** Advances to the next question, or reports the result after the last. */
  next: () => void;
};

/**
 * State machine for the untimed algebraic-notation quiz: pick one option per
 * question, see the feedback, then advance. There is no clock and no retry,
 * so each question contributes at most one point.
 */
export function useAlgebraicNotationSession({
  questions,
  onComplete,
}: UseAlgebraicNotationSessionConfig): UseAlgebraicNotationSessionReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const question = questions[currentIndex];
  const total = questions.length;
  const isLastQuestion = currentIndex >= total - 1;

  const selectOption = useCallback(
    (option: string) => {
      if (answered) return;
      setSelectedAnswer(option);
      setAnswered(true);
      if (isCorrectAnswer(question, option)) {
        setScore((prev) => prev + 1);
      }
    },
    [answered, question],
  );

  const next = useCallback(() => {
    if (isLastQuestion) {
      onComplete({ score, total });
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer("");
    setAnswered(false);
  }, [isLastQuestion, onComplete, score, total]);

  return {
    question,
    currentIndex,
    total,
    selectedAnswer,
    answered,
    score,
    isLastQuestion,
    selectOption,
    next,
  };
}
