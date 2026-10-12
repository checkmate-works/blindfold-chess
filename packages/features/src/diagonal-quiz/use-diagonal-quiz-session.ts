"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Square } from "@blindfold-chess/types";

import { flashFeedbackDuration } from "../common/flash-policy";
import { generateSquareSequence } from "../common/utils";
import { useBufferedQuestions } from "../practice-session/use-buffered-questions";
import { useTimedPracticeCompletion } from "../practice-session/use-practice-completion";
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
  currentSquare: Square | null;
  lastAnswer: {
    correct: boolean;
    isDiagonalCorrect: boolean;
    isAntiDiagonalCorrect: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null;
  /**
   * One entry per answered question, plus — once the time limit has ended the
   * run — a trailing `timedOut` entry for the question left unanswered.
   */
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

  const session = useTimedSession<Square>({
    timeLimit,
    generateQuestion,
    onAnswerEffect,
    mistakeAllowance,
    feedbackDuration: flashFeedbackDuration,
  });

  const { showFeedback } = session;

  useEffect(() => {
    if (!showFeedback) {
      setLastAnswer(null);
    }
  }, [showFeedback]);

  useTimedPracticeCompletion(session, timeLimit, onComplete);

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

  // Only the time limit leaves a question unanswered: the timer is paused
  // during the feedback flash, and the other endings follow an answer (the
  // mistake limit) or are the player's own choice (quit).
  const { finishReason } = session;
  const questionResultsWithTimeUp = useMemo(() => {
    if (finishReason !== "timeUp" || !currentQuestion) return questionResults;
    const { diagonal, antiDiagonal } = getDiagonals(currentQuestion);
    return [
      ...questionResults,
      {
        square: currentQuestion,
        isCorrect: false,
        isDiagonalCorrect: false,
        isAntiDiagonalCorrect: false,
        correctDiagonal: diagonal,
        correctAntiDiagonal: antiDiagonal,
        timedOut: true as const,
      },
    ];
  }, [finishReason, currentQuestion, questionResults]);

  return {
    ...toTimedSessionFacade(session),
    currentSquare: currentQuestion,
    lastAnswer,
    questionResults: questionResultsWithTimeUp,
    handleAnswer,
  };
}
