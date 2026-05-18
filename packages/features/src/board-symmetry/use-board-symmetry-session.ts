"use client";

import { useCallback, useState } from "react";

import { applyCoordinateBackspace, FEEDBACK_FLASH_MS } from "../common";
import { computePracticeResult } from "../common/practice-result";
import { usePracticeCompletion } from "../practice-session/use-practice-completion";
import {
  type TimedQuizSessionConfig,
  type TimedSessionFacade,
  toTimedSessionFacade,
} from "../practice-session/quiz-session";
import { useTimedSession } from "../practice-session/use-timed-session";
import { checkSymmetryAnswer, generateProblem } from "./logic";
import type { BoardSymmetryProblem, BoardSymmetryResult } from "./types";

export type UseBoardSymmetrySessionConfig =
  TimedQuizSessionConfig<BoardSymmetryResult>;

export type UseBoardSymmetrySessionReturn = TimedSessionFacade & {
  currentProblem: BoardSymmetryProblem | null;
  selectedFile: string | null;
  selectedRank: string | null;
  correctSolution: string | null;
  handleFileToggle: (file: string) => void;
  handleRankToggle: (rank: string) => void;
  handleBackspace: () => void;
  handleAnswer: (file: string, rank: string) => void;
};

export function useBoardSymmetrySession({
  timeLimit,
  onComplete,
  onAnswerEffect,
  mistakeAllowance,
}: UseBoardSymmetrySessionConfig): UseBoardSymmetrySessionReturn {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [correctSolution, setCorrectSolution] = useState<string | null>(null);

  const generateQuestion = useCallback(
    (): BoardSymmetryProblem => generateProblem(),
    [],
  );

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

  usePracticeCompletion(
    isFinished,
    (): BoardSymmetryResult =>
      computePracticeResult(
        correctCount,
        incorrectCount,
        timeElapsed,
        timeLimit,
        session.questionTimes,
      ),
    onComplete,
  );

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
    ...toTimedSessionFacade(session),
    currentProblem: currentQuestion,
    selectedFile,
    selectedRank,
    correctSolution,
    handleFileToggle,
    handleRankToggle,
    handleBackspace,
    handleAnswer,
  };
}
