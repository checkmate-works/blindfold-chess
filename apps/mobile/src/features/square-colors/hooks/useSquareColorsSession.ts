import { useState, useCallback, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  generateSquareSequence,
  getSquareColor,
} from "@blindfold-chess/features/square-colors";
import type { SquareColor, SquareColorsResult } from "../lib/types";

type UseSquareColorsSessionProps = {
  duration: number;
  onComplete: (result: SquareColorsResult) => void;
};

export function useSquareColorsSession({
  duration,
  onComplete,
}: UseSquareColorsSessionProps) {
  const [currentSquare, setCurrentSquare] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const squaresRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const questionTimesRef = useRef<number[]>([]);
  const questionStartRef = useRef<number>(0);

  const nextQuestion = useCallback(() => {
    indexRef.current += 1;
    setCurrentSquare(squaresRef.current[indexRef.current]);
    setIsCorrect(null);
    setIsProcessing(false);
    questionStartRef.current = Date.now();
  }, []);

  const startSession = useCallback(() => {
    const squares = generateSquareSequence(100);
    squaresRef.current = squares;
    indexRef.current = 0;
    setCurrentSquare(squares[0]);
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsCorrect(null);
    setIsProcessing(false);
    questionTimesRef.current = [];
    startTimeRef.current = Date.now();
    questionStartRef.current = Date.now();
  }, []);

  const handleAnswer = useCallback(
    (selectedColor: SquareColor) => {
      if (!currentSquare || isProcessing) return;

      setIsProcessing(true);

      const questionTime = (Date.now() - questionStartRef.current) / 1000;
      questionTimesRef.current.push(questionTime);

      const correctColor = getSquareColor(currentSquare);
      const correct = selectedColor === correctColor;

      setIsCorrect(correct);

      if (correct) {
        setCorrectCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setIncorrectCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      setTimeout(() => {
        nextQuestion();
      }, 500);
    },
    [currentSquare, isProcessing, nextQuestion],
  );

  const endSession = useCallback(() => {
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const total = correctCount + incorrectCount;
    const accuracy = total > 0 ? (correctCount / total) * 100 : 0;
    const times = questionTimesRef.current;
    const averageTime =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    const result: SquareColorsResult = {
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
    currentSquare,
    correctCount,
    incorrectCount,
    isCorrect,
    isProcessing,
    startSession,
    handleAnswer,
    endSession,
  };
}
