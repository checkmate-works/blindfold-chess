"use client";

import { useCallback } from "react";

import { useBufferedQuestions } from "../practice-session/use-buffered-questions";
import { useTimedPracticeCompletion } from "../practice-session/use-practice-completion";
import {
  type TimedQuizSessionConfig,
  type TimedSessionFacade,
  toTimedSessionFacade,
} from "../practice-session/quiz-session";
import { useTimedSession } from "../practice-session/use-timed-session";
import { generateBalancedMoveQuestions, isLegalMove } from "./logic";
import type { LegalMovesResult, MoveQuestion, PieceType } from "./types";

export type UseLegalMovesSessionConfig =
  TimedQuizSessionConfig<LegalMovesResult> & {
    selectedPieces: PieceType[];
  };

export type UseLegalMovesSessionReturn = TimedSessionFacade & {
  currentQuestion: MoveQuestion | null;
  handleAnswer: (userAnswer: boolean) => void;
};

export function useLegalMovesSession({
  timeLimit,
  selectedPieces,
  onComplete,
  onAnswerEffect,
  mistakeAllowance,
}: UseLegalMovesSessionConfig): UseLegalMovesSessionReturn {
  const generateQuestion = useBufferedQuestions(
    (count) => generateBalancedMoveQuestions(count, selectedPieces),
    { initialCount: 100 },
  );

  const session = useTimedSession<MoveQuestion>({
    timeLimit,
    generateQuestion,
    onAnswerEffect,
    mistakeAllowance,
  });

  useTimedPracticeCompletion(session, timeLimit, onComplete);

  const { handleAnswer: sessionHandleAnswer, currentQuestion } = session;

  const handleAnswer = useCallback(
    (userAnswer: boolean) => {
      if (!currentQuestion) return;
      const isLegal = isLegalMove(
        currentQuestion.from,
        currentQuestion.to,
        currentQuestion.piece,
      );
      sessionHandleAnswer(userAnswer === isLegal);
    },
    [currentQuestion, sessionHandleAnswer],
  );

  return {
    ...toTimedSessionFacade(session),
    currentQuestion,
    handleAnswer,
  };
}
