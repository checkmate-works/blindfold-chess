import { useState, useCallback, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  generateBalancedMoveQuestions,
  isLegalMove,
} from "@blindfold-chess/features/legal-moves";
import type { MoveQuestion, PieceType, LegalMovesResult } from "../lib/types";

type UseLegalMovesSessionProps = {
  duration: number;
  selectedPieces: PieceType[];
  onComplete: (result: LegalMovesResult) => void;
};

export function useLegalMovesSession({
  duration,
  selectedPieces,
  onComplete,
}: UseLegalMovesSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<MoveQuestion[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const startTimeRef = useRef<number>(0);
  const questionTimesRef = useRef<number[]>([]);
  const questionStartRef = useRef<number>(0);

  const currentQuestion =
    questions.length > 0 ? (questions[currentIndex] ?? null) : null;

  // Start the session
  const startSession = useCallback(() => {
    const generated = generateBalancedMoveQuestions(100, selectedPieces);
    setQuestions(generated);
    setCurrentIndex(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setFeedback(null);
    setIsProcessing(false);
    questionTimesRef.current = [];
    startTimeRef.current = Date.now();
    questionStartRef.current = Date.now();
  }, [selectedPieces]);

  // Handle answer (true = legal, false = illegal)
  const handleAnswer = useCallback(
    (userAnswer: boolean) => {
      if (!currentQuestion || isProcessing || feedback) return;

      setIsProcessing(true);

      const isLegal = isLegalMove(
        currentQuestion.from,
        currentQuestion.to,
        currentQuestion.piece,
      );
      const isCorrect = userAnswer === isLegal;

      // Record question time
      const questionTime = (Date.now() - questionStartRef.current) / 1000;
      questionTimesRef.current.push(questionTime);

      // Update counts
      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setIncorrectCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      // Set feedback
      setFeedback(isCorrect ? "correct" : "incorrect");

      // Move to next question after delay
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setFeedback(null);
        setIsProcessing(false);
        questionStartRef.current = Date.now();
      }, 500);
    },
    [currentQuestion, isProcessing, feedback],
  );

  // End the session and calculate results
  const endSession = useCallback(() => {
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
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
      timeTaken: Math.min(timeTaken, duration),
      averageTime,
    };

    onComplete(result);
  }, [correctCount, incorrectCount, duration, onComplete]);

  return {
    currentQuestion,
    correctCount,
    incorrectCount,
    feedback,
    isProcessing,
    startSession,
    handleAnswer,
    endSession,
  };
}
