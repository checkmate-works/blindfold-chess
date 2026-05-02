"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { applyCoordinateBackspace, FEEDBACK_FLASH_MS } from "../common";
import { computePracticeResult } from "../common/practice-result";
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

  // Must run via onAdvance (not a separate showFeedback effect) so the auto-
  // submit effect in `BoardSymmetryChallenge` cannot observe stale file/rank
  // alongside the new question — the bug that caused hearts to decrement on
  // every answer. See UseTimedSessionConfig.onAdvance for the batching contract.
  const handleAdvance = useCallback(() => {
    setSelectedFile(null);
    setSelectedRank(null);
    setCorrectSolution(null);
  }, []);

  const session = useTimedSession<BoardSymmetryProblem>({
    timeLimit,
    generateQuestion,
    onAnswerEffect,
    mistakeAllowance,
    feedbackDuration: (correct: boolean) =>
      correct ? FEEDBACK_FLASH_MS.correct : FEEDBACK_FLASH_MS.incorrect,
    onAdvance: handleAdvance,
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
    if (!isFinished) return;

    const result: BoardSymmetryResult = computePracticeResult(
      correctCount,
      incorrectCount,
      timeElapsed,
      timeLimit,
      questionTimesRef.current,
    );

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
