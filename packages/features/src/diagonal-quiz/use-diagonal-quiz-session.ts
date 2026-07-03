"use client";

import { useCallback, useEffect, useState } from "react";

import { FEEDBACK_FLASH_MS } from "../common/flash-policy";
import { computePracticeResult } from "../common/practice-result";
import { generateSquareSequence } from "../common/utils";
import { useBufferedQuestions } from "../practice-session/use-buffered-questions";
import { usePracticeCompletion } from "../practice-session/use-practice-completion";
import {
  type TimedQuizSessionConfig,
  type TimedSessionFacade,
  toTimedSessionFacade,
} from "../practice-session/quiz-session";
import { useTimedSession } from "../practice-session/use-timed-session";
import {
  EXCLUDED_QUIZ_SQUARES,
  getDiagonals,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from "./logic";
import type { DiagonalQuestionResult, DiagonalQuizResult } from "./types";

export type UseDiagonalQuizSessionConfig =
  TimedQuizSessionConfig<DiagonalQuizResult>;

export type UseDiagonalQuizSessionReturn = TimedSessionFacade & {
  currentSquare: string | null;
  lastAnswer: {
    correct: boolean;
    isDiagonalCorrect: boolean;
    isAntiDiagonalCorrect: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null;
  questionResults: DiagonalQuestionResult[];
  handleAnswer: (diagonalAnswer: string, antiDiagonalAnswer: string) => void;
};

export function useDiagonalQuizSession({
  timeLimit,
  onComplete,
  onAnswerEffect,
  mistakeAllowance,
}: UseDiagonalQuizSessionConfig): UseDiagonalQuizSessionReturn {
  const generateQuestion = useBufferedQuestions((count) =>
    generateSquareSequence(count, Math.random, EXCLUDED_QUIZ_SQUARES),
  );

  const [questionResults, setQuestionResults] = useState<
    DiagonalQuestionResult[]
  >([]);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    isDiagonalCorrect: boolean;
    isAntiDiagonalCorrect: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null>(null);

  const session = useTimedSession<string>({
    timeLimit,
    generateQuestion,
    onAnswerEffect,
    mistakeAllowance,
    feedbackDuration: (correct: boolean) =>
      correct ? FEEDBACK_FLASH_MS.correct : FEEDBACK_FLASH_MS.incorrect,
  });

  const {
    correctCount,
    incorrectCount,
    timeElapsed,
    isFinished,
    showFeedback,
  } = session;

  useEffect(() => {
    if (!showFeedback) {
      setLastAnswer(null);
    }
  }, [showFeedback]);

  usePracticeCompletion(
    isFinished,
    (): DiagonalQuizResult =>
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
    (diagonalAnswer: string, antiDiagonalAnswer: string) => {
      if (!currentQuestion) return;

      const { diagonal, antiDiagonal } = getDiagonals(currentQuestion);

      const diagonalValid = isValidDiagonalAnswer(diagonalAnswer);
      const antiDiagonalValid = isValidDiagonalAnswer(antiDiagonalAnswer);

      const diagonalCorrect =
        diagonalValid &&
        normalizeDiagonal(diagonalAnswer) === normalizeDiagonal(diagonal);
      const antiDiagonalCorrect =
        antiDiagonalValid &&
        normalizeDiagonal(antiDiagonalAnswer) ===
          normalizeDiagonal(antiDiagonal);

      const isCorrect = diagonalCorrect && antiDiagonalCorrect;

      setQuestionResults((prev) => [
        ...prev,
        {
          square: currentQuestion,
          isCorrect,
          isDiagonalCorrect: diagonalCorrect,
          isAntiDiagonalCorrect: antiDiagonalCorrect,
          correctDiagonal: diagonal,
          correctAntiDiagonal: antiDiagonal,
          userDiagonal: diagonalAnswer,
          userAntiDiagonal: antiDiagonalAnswer,
        },
      ]);
      setLastAnswer({
        correct: isCorrect,
        isDiagonalCorrect: diagonalCorrect,
        isAntiDiagonalCorrect: antiDiagonalCorrect,
        correctDiagonal: diagonal,
        correctAntiDiagonal: antiDiagonal,
      });

      sessionHandleAnswer(isCorrect);
    },
    [currentQuestion, sessionHandleAnswer],
  );

  return {
    ...toTimedSessionFacade(session),
    currentSquare: currentQuestion,
    lastAnswer,
    questionResults,
    handleAnswer,
  };
}
