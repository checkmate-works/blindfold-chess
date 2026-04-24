import { useCallback, useEffect, useRef, useState } from "react";

import { applyCoordinateBackspace, FEEDBACK_FLASH_MS } from "../common";
import { useTimedSession } from "../practice-session/use-timed-session";
import { checkSymmetryAnswer, generateProblem } from "./logic";
import type { BoardSymmetryProblem, BoardSymmetryResult } from "./types";

export type UseBoardSymmetrySessionConfig = {
  timeLimit: number;
  onComplete?: (result: BoardSymmetryResult) => void;
  onAnswerEffect?: (correct: boolean) => void;
  mistakeAllowance?: number;
};

export type UseBoardSymmetrySessionReturn = {
  currentProblem: BoardSymmetryProblem | null;
  countdown: number | null;
  timeElapsed: number;
  timeRemaining: number;
  correctCount: number;
  incorrectCount: number;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  isFinished: boolean;
  isPaused: boolean;
  selectedFile: string | null;
  selectedRank: string | null;
  correctSolution: string | null;
  handleFileToggle: (file: string) => void;
  handleRankToggle: (rank: string) => void;
  handleBackspace: () => void;
  handleAnswer: (file: string, rank: string) => void;
  togglePause: () => void;
};

export function useBoardSymmetrySession({
  timeLimit,
  onComplete,
  onAnswerEffect,
  mistakeAllowance,
}: UseBoardSymmetrySessionConfig): UseBoardSymmetrySessionReturn {
  const questionTimesRef = useRef<number[]>([]);
  // per-question timing — useTimedSession tracks session-wide elapsed time only
  const questionStartRef = useRef<number>(Date.now());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [correctSolution, setCorrectSolution] = useState<string | null>(null);

  const generateQuestion = useCallback((): BoardSymmetryProblem => {
    questionTimesRef.current.push(
      // per-question timing — useTimedSession tracks session-wide elapsed time only
      (Date.now() - questionStartRef.current) / 1000,
    );
    questionStartRef.current = Date.now(); // per-question timing — useTimedSession tracks session-wide elapsed time only
    return generateProblem();
  }, []);

  const session = useTimedSession<BoardSymmetryProblem>({
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
    countdown,
    isPaused,
  } = session;

  useEffect(() => {
    if (!showFeedback) {
      setSelectedFile(null);
      setSelectedRank(null);
      setCorrectSolution(null);
    }
  }, [showFeedback]);

  useEffect(() => {
    if (!isFinished) return;

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
      timeTaken: Math.min(timeElapsed, timeLimit),
      averageTime,
    };

    onCompleteRef.current?.(result);
  }, [isFinished, correctCount, incorrectCount, timeElapsed, timeLimit]);

  const { handleAnswer: sessionHandleAnswer, currentQuestion } = session;

  const isBlocked =
    isFinished || countdown !== null || isPaused || showFeedback;

  const handleFileToggle = useCallback(
    (file: string) => {
      if (isBlocked) return;
      setSelectedFile((prev) => (prev === file ? null : file));
    },
    [isBlocked],
  );

  const handleRankToggle = useCallback(
    (rank: string) => {
      if (isBlocked) return;
      setSelectedRank((prev) => (prev === rank ? null : rank));
    },
    [isBlocked],
  );

  const handleBackspace = useCallback(() => {
    if (isBlocked) return;
    const { next } = applyCoordinateBackspace({ selectedFile, selectedRank });
    setSelectedFile(next.selectedFile);
    setSelectedRank(next.selectedRank);
  }, [isBlocked, selectedFile, selectedRank]);

  const handleAnswer = useCallback(
    (file: string, rank: string) => {
      if (!currentQuestion || isBlocked) return;

      const { isCorrect: correct, correctSquare } = checkSymmetryAnswer(
        file,
        rank,
        currentQuestion,
      );

      setCorrectSolution(correctSquare);
      sessionHandleAnswer(correct);
    },
    [currentQuestion, isBlocked, sessionHandleAnswer],
  );

  return {
    currentProblem: currentQuestion,
    countdown,
    timeElapsed,
    timeRemaining: session.timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    lastAnswerCorrect: session.lastAnswerCorrect,
    isFinished,
    isPaused,
    selectedFile,
    selectedRank,
    correctSolution,
    handleFileToggle,
    handleRankToggle,
    handleBackspace,
    handleAnswer,
    togglePause: session.togglePause,
  };
}
