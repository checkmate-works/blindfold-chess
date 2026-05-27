"use client";

import { useCallback, useRef } from "react";

import { computePracticeResult } from "../common/practice-result";
import { usePracticeCompletion } from "../practice-session/use-practice-completion";
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
  const questionsRef = useRef<MoveQuestion[]>(
    generateBalancedMoveQuestions(100, selectedPieces),
  );
  const indexRef = useRef(0);

  const generateQuestion = useCallback((): MoveQuestion => {
    if (indexRef.current >= questionsRef.current.length - 10) {
      questionsRef.current = [
        ...questionsRef.current,
        ...generateBalancedMoveQuestions(100, selectedPieces),
      ];
    }
    const question = questionsRef.current[indexRef.current];
    indexRef.current += 1;
    return question;
  }, [selectedPieces]);

  const session = useTimedSession<MoveQuestion>({
    timeLimit,
    generateQuestion,
    onAnswerEffect,
    mistakeAllowance,
  });

  const { correctCount, incorrectCount, timeElapsed, isFinished } = session;

  usePracticeCompletion(
    isFinished,
    (): LegalMovesResult =>
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
