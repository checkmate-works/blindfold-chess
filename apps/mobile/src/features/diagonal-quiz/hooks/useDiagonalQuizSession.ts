import { useState, useCallback, useRef } from "react";
import * as Haptics from "expo-haptics";
import { generateSquareSequence } from "@blindfold-chess/features/common";
import {
  getDiagonals,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from "@blindfold-chess/features/diagonal-quiz";
import type { DiagonalQuestionResult, DiagonalQuizResult } from "../lib/types";

type UseDiagonalQuizSessionProps = {
  duration: number;
  onComplete: (result: DiagonalQuizResult) => void;
};

export function useDiagonalQuizSession({
  duration,
  onComplete,
}: UseDiagonalQuizSessionProps) {
  const [currentSquare, setCurrentSquare] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null>(null);
  const [questionResults, setQuestionResults] = useState<
    DiagonalQuestionResult[]
  >([]);

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
    setLastAnswer(null);
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
    setLastAnswer(null);
    setQuestionResults([]);
    questionTimesRef.current = [];
    startTimeRef.current = Date.now();
    questionStartRef.current = Date.now();
  }, []);

  const handleAnswer = useCallback(
    (diagonalAnswer: string, antiDiagonalAnswer: string) => {
      if (!currentSquare || isProcessing) return;

      setIsProcessing(true);

      const questionTime = (Date.now() - questionStartRef.current) / 1000;
      questionTimesRef.current.push(questionTime);

      const { diagonal, antiDiagonal } = getDiagonals(currentSquare);

      const diagonalValid = isValidDiagonalAnswer(diagonalAnswer);
      const antiDiagonalValid = isValidDiagonalAnswer(antiDiagonalAnswer);

      const diagonalCorrect =
        diagonalValid &&
        normalizeDiagonal(diagonalAnswer) === normalizeDiagonal(diagonal);
      const antiDiagonalCorrect =
        antiDiagonalValid &&
        normalizeDiagonal(antiDiagonalAnswer) ===
          normalizeDiagonal(antiDiagonal);

      const correct = diagonalCorrect && antiDiagonalCorrect;

      setIsCorrect(correct);
      setLastAnswer({
        correct,
        correctDiagonal: diagonal,
        correctAntiDiagonal: antiDiagonal,
      });
      setQuestionResults((prev) => [
        ...prev,
        {
          square: currentSquare,
          isCorrect: correct,
          isDiagonalCorrect: diagonalCorrect,
          isAntiDiagonalCorrect: antiDiagonalCorrect,
          correctDiagonal: diagonal,
          correctAntiDiagonal: antiDiagonal,
          userDiagonal: diagonalAnswer,
          userAntiDiagonal: antiDiagonalAnswer,
        },
      ]);

      if (correct) {
        setCorrectCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setIncorrectCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      setTimeout(
        () => {
          nextQuestion();
        },
        correct ? 1000 : 2000,
      );
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

    const result: DiagonalQuizResult = {
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
    lastAnswer,
    questionResults,
    startSession,
    handleAnswer,
    endSession,
  };
}
