"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTimedSession } from "../practice-session/use-timed-session";
import { FEEDBACK_FLASH_MS } from "../common/flash-policy";
import {
  generateSquareSequence,
  getDiagonals,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from "./logic";
import type { DiagonalQuestionResult, DiagonalQuizResult } from "./types";

export type UseDiagonalQuizSessionConfig = {
  timeLimit: number;
  onComplete?: (result: DiagonalQuizResult) => void;
  onAnswerEffect?: (correct: boolean) => void;
  mistakeAllowance?: number;
};

export type UseDiagonalQuizSessionReturn = {
  currentSquare: string | null;
  countdown: number | null;
  timeElapsed: number;
  timeRemaining: number;
  correctCount: number;
  incorrectCount: number;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  lastAnswer: {
    correct: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null;
  questionResults: DiagonalQuestionResult[];
  isFinished: boolean;
  isPaused: boolean;
  handleAnswer: (diagonalAnswer: string, antiDiagonalAnswer: string) => void;
  togglePause: () => void;
};

export function useDiagonalQuizSession({
  timeLimit,
  onComplete,
  onAnswerEffect,
  mistakeAllowance,
}: UseDiagonalQuizSessionConfig): UseDiagonalQuizSessionReturn {
  const squaresRef = useRef<string[]>(generateSquareSequence(200));
  const indexRef = useRef(0);
  const questionTimesRef = useRef<number[]>([]);
  // per-question timing — useTimedSession tracks session-wide elapsed time only
  const questionStartRef = useRef<number>(Date.now());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [questionResults, setQuestionResults] = useState<
    DiagonalQuestionResult[]
  >([]);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null>(null);

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

  useEffect(() => {
    if (!isFinished) return;

    const total = correctCount + incorrectCount;
    const accuracy = total > 0 ? (correctCount / total) * 100 : 0;
    const times = questionTimesRef.current;
    const averageTime =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    const result: DiagonalQuizResult = {
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      totalQuestions: total,
      accuracy,
      timeTaken: Math.min(timeElapsed, timeLimit),
      averageTime,
    };

    onCompleteRef.current?.(result);
  }, [isFinished, correctCount, incorrectCount, timeElapsed, timeLimit]);

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
        correctDiagonal: diagonal,
        correctAntiDiagonal: antiDiagonal,
      });

      sessionHandleAnswer(isCorrect);
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
    showFeedback,
    lastAnswerCorrect: session.lastAnswerCorrect,
    lastAnswer,
    questionResults,
    isFinished,
    isPaused: session.isPaused,
    handleAnswer,
    togglePause: session.togglePause,
  };
}
