"use client";

import { useCallback, useState } from "react";

import { useBufferedQuestions } from "../practice-session/use-buffered-questions";
import { useTimedPracticeCompletion } from "../practice-session/use-practice-completion";
import {
  type TimedQuizSessionConfig,
  type TimedSessionFacade,
  toTimedSessionFacade,
} from "../practice-session/quiz-session";
import { useTimedSession } from "../practice-session/use-timed-session";
import {
  checkQuadrantAnswer,
  generateQuadrantQuestionBatch,
  getCorrectQuadrant,
  quadrantFeedbackDuration,
} from "./logic";
import type {
  BoardOrientation,
  QuadrantId,
  QuadrantQuestion,
  QuadrantsResult,
} from "./types";

/**
 * Questions per generated batch. The run is short enough that one batch
 * almost always covers it; the buffer appends another if it does not.
 */
const BATCH_SIZE = 100;

export type UseQuadrantsSessionConfig =
  TimedQuizSessionConfig<QuadrantsResult> & {
    /** `random` re-rolls the side for every question. */
    orientation: BoardOrientation;
  };

export type UseQuadrantsSessionReturn = TimedSessionFacade & {
  currentQuestion: QuadrantQuestion | null;
  /** Seconds of play actually spent, as the result screen reports it. */
  totalTime: number;
  handleAnswer: (selectedQuadrant: QuadrantId) => void;
  /** The quadrant that held the square, while the answer's feedback shows. */
  correctQuadrant: QuadrantId | null;
  /** The quadrant the player picked, while a wrong answer's feedback shows. */
  wrongQuadrant: QuadrantId | null;
};

/**
 * The timed quadrants quiz: a square is named, the player taps the quarter of
 * the board it lies in, and the run ends on the time limit or when the
 * mistake allowance is used up.
 */
export function useQuadrantsSession({
  orientation,
  timeLimit,
  mistakeAllowance,
  onAnswerEffect,
  onComplete,
}: UseQuadrantsSessionConfig): UseQuadrantsSessionReturn {
  const generateQuestion = useBufferedQuestions(
    (count) => generateQuadrantQuestionBatch(count, orientation),
    { initialCount: BATCH_SIZE, refillCount: BATCH_SIZE },
  );

  const session = useTimedSession<QuadrantQuestion>({
    timeLimit,
    generateQuestion,
    mistakeAllowance,
    onAnswerEffect,
    feedbackDuration: quadrantFeedbackDuration,
  });

  useTimedPracticeCompletion(session, timeLimit, onComplete);

  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantId | null>(
    null,
  );

  const { currentQuestion, handleAnswer: sessionHandleAnswer } = session;

  const handleAnswer = useCallback(
    (quadrant: QuadrantId) => {
      if (!currentQuestion) return;
      setSelectedQuadrant(quadrant);
      sessionHandleAnswer(
        checkQuadrantAnswer(currentQuestion.square, quadrant),
      );
    },
    [currentQuestion, sessionHandleAnswer],
  );

  const correctQuadrant =
    session.showFeedback && currentQuestion
      ? getCorrectQuadrant(currentQuestion.square)
      : null;
  const wrongQuadrant =
    session.showFeedback && session.lastAnswerCorrect === false
      ? selectedQuadrant
      : null;

  return {
    ...toTimedSessionFacade(session),
    currentQuestion,
    totalTime: session.totalTime,
    handleAnswer,
    correctQuadrant,
    wrongQuadrant,
  };
}
