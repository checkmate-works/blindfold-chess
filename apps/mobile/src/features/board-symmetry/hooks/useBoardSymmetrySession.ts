import { useState, useCallback, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  generateProblem,
  checkSymmetryAnswer,
} from "@blindfold-chess/features/board-symmetry";
import { FEEDBACK_FLASH_MS } from "@blindfold-chess/features/common";
import type { BoardSymmetryProblem, BoardSymmetryResult } from "../lib/types";

type UseBoardSymmetrySessionProps = {
  duration: number;
  onComplete: (result: BoardSymmetryResult) => void;
};

export function useBoardSymmetrySession({
  duration,
  onComplete,
}: UseBoardSymmetrySessionProps) {
  const [problem, setProblem] = useState<BoardSymmetryProblem | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctSolution, setCorrectSolution] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startTimeRef = useRef<number>(0);
  const questionTimesRef = useRef<number[]>([]);
  const questionStartRef = useRef<number>(0);

  const nextProblem = useCallback(() => {
    setProblem(generateProblem());
    setSelectedFile(null);
    setSelectedRank(null);
    setIsCorrect(null);
    setCorrectSolution(null);
    setIsProcessing(false);
    questionStartRef.current = Date.now();
  }, []);

  const startSession = useCallback(() => {
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsCorrect(null);
    setCorrectSolution(null);
    setIsProcessing(false);
    questionTimesRef.current = [];
    startTimeRef.current = Date.now();
    nextProblem();
  }, [nextProblem]);

  const handleFileToggle = useCallback(
    (file: string) => {
      if (isProcessing) return;
      setSelectedFile((prev) => (prev === file ? null : file));
    },
    [isProcessing],
  );

  const handleRankToggle = useCallback(
    (rank: string) => {
      if (isProcessing) return;
      setSelectedRank((prev) => (prev === rank ? null : rank));
    },
    [isProcessing],
  );

  const handleAnswer = useCallback(
    (file: string, rank: string) => {
      if (!problem || isProcessing) return;

      setIsProcessing(true);

      const questionTime = (Date.now() - questionStartRef.current) / 1000;
      questionTimesRef.current.push(questionTime);

      const { isCorrect: correct, correctSquare } = checkSymmetryAnswer(
        file,
        rank,
        problem,
      );

      setIsCorrect(correct);
      setCorrectSolution(correctSquare);

      if (correct) {
        setCorrectCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setIncorrectCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      setTimeout(
        () => {
          nextProblem();
        },
        correct ? FEEDBACK_FLASH_MS.correct : FEEDBACK_FLASH_MS.incorrect,
      );
    },
    [problem, isProcessing, nextProblem],
  );

  const endSession = useCallback(() => {
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const total = correctCount + incorrectCount;
    const accuracy = total > 0 ? (correctCount / total) * 100 : 0;
    const times = questionTimesRef.current;
    const averageTime =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    const result: BoardSymmetryResult = {
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
    problem,
    selectedFile,
    selectedRank,
    correctCount,
    incorrectCount,
    isCorrect,
    correctSolution,
    isProcessing,
    startSession,
    handleFileToggle,
    handleRankToggle,
    handleAnswer,
    endSession,
  };
}
