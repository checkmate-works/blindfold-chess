import { useState, useCallback, useRef } from "react";
import * as Haptics from "expo-haptics";
import type {
  QuizSettings,
  QuizResult,
  CoordinateQuestion,
  Square,
  AnswerFeedback,
} from "../lib/types";
import { FEEDBACK_SPEED_MS } from "../lib/types";
import {
  generateSingleQuestion,
  checkAnswer,
  calculateScore,
} from "../lib/utils";

type UseQuizSessionProps = {
  settings: QuizSettings;
  onComplete: (result: QuizResult) => void;
};

export function useQuizSession({ settings, onComplete }: UseQuizSessionProps) {
  const [currentQuestion, setCurrentQuestion] =
    useState<CoordinateQuestion | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [feedback, setFeedback] = useState<AnswerFeedback>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const recentSquaresRef = useRef<Square[]>([]);
  const startTimeRef = useRef<number>(0);

  // Generate next question
  const generateNextQuestion = useCallback(() => {
    const question = generateSingleQuestion(
      settings.orientation,
      recentSquaresRef.current,
    );

    // Keep track of recent squares to avoid repetition
    recentSquaresRef.current = [
      question.targetSquare,
      ...recentSquaresRef.current.slice(0, 7), // Keep last 8 squares
    ];

    setCurrentQuestion(question);
    setFeedback(null);
  }, [settings.orientation]);

  // Start the session
  const startSession = useCallback(() => {
    setCorrectCount(0);
    setTotalCount(0);
    setFeedback(null);
    setIsProcessing(false);
    recentSquaresRef.current = [];
    startTimeRef.current = Date.now();
    generateNextQuestion();
  }, [generateNextQuestion]);

  // Handle square tap
  const handleSquareTap = useCallback(
    (tappedSquare: Square) => {
      if (!currentQuestion || isProcessing || feedback) return;

      setIsProcessing(true);
      const isCorrect = checkAnswer(tappedSquare, currentQuestion.targetSquare);

      // Update counts
      setTotalCount((prev) => prev + 1);
      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
      }

      // Set feedback
      setFeedback(isCorrect ? "correct" : "incorrect");

      // Haptic feedback
      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      // Move to next question after feedback delay
      const feedbackDuration = FEEDBACK_SPEED_MS[settings.feedbackSpeed];
      setTimeout(() => {
        generateNextQuestion();
        setIsProcessing(false);
      }, feedbackDuration);
    },
    [
      currentQuestion,
      isProcessing,
      feedback,
      settings.feedbackSpeed,
      generateNextQuestion,
    ],
  );

  // End the session and calculate results
  const endSession = useCallback(() => {
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const { points, accuracy, averageTime } = calculateScore(
      correctCount,
      totalCount,
      timeTaken,
      settings.duration,
    );

    const result: QuizResult = {
      totalQuestions: totalCount,
      correctAnswers: correctCount,
      accuracy,
      averageTime,
      points,
      timeTaken,
    };

    onComplete(result);
  }, [correctCount, totalCount, settings.duration, onComplete]);

  return {
    currentQuestion,
    correctCount,
    totalCount,
    feedback,
    isProcessing,
    startSession,
    handleSquareTap,
    endSession,
  };
}
