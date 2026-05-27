"use client";

import { useCallback, useRef } from "react";

import type { BoardOrientation, Square } from "@blindfold-chess/types";

import {
  FEEDBACK_SPEED_MS,
  type FeedbackSpeed,
} from "../common/feedback-speed";
import { usePracticeCompletion } from "../practice-session/use-practice-completion";
import {
  type TimedQuizSessionConfig,
  type TimedSessionFacade,
  toTimedSessionFacade,
} from "../practice-session/quiz-session";
import { useTimedSession } from "../practice-session/use-timed-session";
import { generateSingleQuestion, checkAnswer, calculateScore } from "./logic";
import type { CoordinateQuestion, QuizResult } from "./types";

export type UseCoordinateQuizSessionConfig =
  TimedQuizSessionConfig<QuizResult> & {
    orientation: BoardOrientation;
    feedbackSpeed: FeedbackSpeed;
  };

export type UseCoordinateQuizSessionReturn = TimedSessionFacade & {
  currentQuestion: CoordinateQuestion | null;
  handleAnswer: (square: Square) => void;
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

  usePracticeCompletion(
    isFinished,
    (): QuizResult => {
      const total = correctCount + incorrectCount;
      const timeTaken = Math.min(timeElapsed, timeLimit);
      const { points, accuracy, averageTime } = calculateScore(
        correctCount,
        total,
        timeTaken,
        timeLimit,
      );
      return {
        correctAnswers: correctCount,
        totalQuestions: total,
        accuracy,
        timeTaken,
        averageTime,
        points,
      };
    },
    onComplete,
  );

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
    ...toTimedSessionFacade(session),
    currentQuestion,
    handleAnswer,
  };
}
