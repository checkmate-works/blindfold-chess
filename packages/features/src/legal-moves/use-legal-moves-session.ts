"use client";

import { useCallback, useEffect, useRef } from "react";

import { useTimedSession } from "../practice-session/use-timed-session";
import { generateBalancedMoveQuestions, isLegalMove } from "./logic";
import type { LegalMovesResult, MoveQuestion, PieceType } from "./types";

export type UseLegalMovesSessionConfig = {
  timeLimit: number;
  selectedPieces: PieceType[];
  onComplete?: (result: LegalMovesResult) => void;
  onAnswerEffect?: (correct: boolean) => void;
  mistakeAllowance?: number;
};

export type UseLegalMovesSessionReturn = {
  currentQuestion: MoveQuestion | null;
  countdown: number | null;
  timeElapsed: number;
  timeRemaining: number;
  correctCount: number;
  incorrectCount: number;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  isFinished: boolean;
  isPaused: boolean;
  handleAnswer: (userAnswer: boolean) => void;
  togglePause: () => void;
};

export function useLegalMovesSession({
  timeLimit,
  selectedPieces,
  onComplete,
  onAnswerEffect,
  mistakeAllowance,
}: UseLegalMovesSessionConfig): UseLegalMovesSessionReturn {
  const questionsRef = useRef<MoveQuestion[]>(
    generateBalancedMoveQuestions(100, selectedPieces),
  );
  const indexRef = useRef(0);
  const questionTimesRef = useRef<number[]>([]);
  // per-question timing — useTimedSession tracks session-wide elapsed time only
  const questionStartRef = useRef<number>(Date.now());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const generateQuestion = useCallback((): MoveQuestion => {
    questionTimesRef.current.push(
      // per-question timing — useTimedSession tracks session-wide elapsed time only
      (Date.now() - questionStartRef.current) / 1000,
    );
    questionStartRef.current = Date.now(); // per-question timing — useTimedSession tracks session-wide elapsed time only

    if (indexRef.current >= questionsRef.current.length - 10) {
      questionsRef.current = [
        ...questionsRef.current,
        ...generateBalancedMoveQuestions(100, selectedPieces),
      ];
    }
    const question = questionsRef.current[indexRef.current];
    indexRef.current += 1;
    return question;
  }, [selectedPieces]);

  const session = useTimedSession<MoveQuestion>({
    timeLimit,
    generateQuestion,
    onAnswerEffect,
    mistakeAllowance,
  });

  const { correctCount, incorrectCount, timeElapsed, isFinished } = session;

  useEffect(() => {
    if (!isFinished) return;

    const total = correctCount + incorrectCount;
    const accuracy = total > 0 ? (correctCount / total) * 100 : 0;
    const times = questionTimesRef.current;
    const averageTime =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    const result: LegalMovesResult = {
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
    (userAnswer: boolean) => {
      if (!currentQuestion) return;
      const isLegal = isLegalMove(
        currentQuestion.from,
        currentQuestion.to,
        currentQuestion.piece,
      );
      sessionHandleAnswer(userAnswer === isLegal);
    },
    [currentQuestion, sessionHandleAnswer],
  );

  return {
    currentQuestion,
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
