import { useCallback, useEffect, useRef } from "react";

import type { BoardOrientation, Square } from "@blindfold-chess/types";

import { useTimedSession } from "../practice-session/use-timed-session";
import {
  FEEDBACK_SPEED_MS,
  type FeedbackSpeed,
} from "../common/feedback-speed";
import { generateSingleQuestion, checkAnswer, calculateScore } from "./logic";
import type { CoordinateQuestion, QuizResult } from "./types";

export type UseCoordinateQuizSessionConfig = {
  timeLimit: number;
  orientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
  onComplete?: (result: QuizResult) => void;
  onAnswerEffect?: (correct: boolean) => void;
  mistakeAllowance?: number;
};

export type UseCoordinateQuizSessionReturn = {
  currentQuestion: CoordinateQuestion | null;
  countdown: number | null;
  timeElapsed: number;
  timeRemaining: number;
  correctCount: number;
  incorrectCount: number;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  isFinished: boolean;
  isPaused: boolean;
  handleAnswer: (square: Square) => void;
  togglePause: () => void;
};

export function useCoordinateQuizSession({
  timeLimit,
  orientation,
  feedbackSpeed,
  onComplete,
  onAnswerEffect,
  mistakeAllowance,
}: UseCoordinateQuizSessionConfig): UseCoordinateQuizSessionReturn {
  const recentSquaresRef = useRef<Square[]>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const generateQuestion = useCallback((): CoordinateQuestion => {
    const question = generateSingleQuestion(
      orientation,
      recentSquaresRef.current,
    );
    recentSquaresRef.current = [
      question.targetSquare,
      ...recentSquaresRef.current,
    ].slice(0, 8);
    return question;
  }, [orientation]);

  const session = useTimedSession<CoordinateQuestion>({
    timeLimit,
    generateQuestion,
    feedbackDuration: FEEDBACK_SPEED_MS[feedbackSpeed],
    onAnswerEffect,
    mistakeAllowance,
  });

  const { correctCount, incorrectCount, timeElapsed, isFinished } = session;

  useEffect(() => {
    if (!isFinished) return;

    const total = correctCount + incorrectCount;
    const timeTaken = Math.min(timeElapsed, timeLimit);
    const { points, accuracy, averageTime } = calculateScore(
      correctCount,
      total,
      timeTaken,
      timeLimit,
    );

    const result: QuizResult = {
      correctAnswers: correctCount,
      totalQuestions: total,
      accuracy,
      timeTaken,
      averageTime,
      points,
    };

    onCompleteRef.current?.(result);
  }, [isFinished, correctCount, incorrectCount, timeElapsed, timeLimit]);

  const { handleAnswer: sessionHandleAnswer, currentQuestion } = session;

  const handleAnswer = useCallback(
    (square: Square) => {
      if (!currentQuestion) return;
      const correct = checkAnswer(square, currentQuestion.targetSquare);
      sessionHandleAnswer(correct);
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
