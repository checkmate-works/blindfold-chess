"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useCountdown } from "./use-countdown";
import { useGameTimer } from "./use-game-timer";

export type UseTimedSessionConfig<TQuestion> = {
  timeLimit: number;
  generateQuestion: () => TQuestion;
  feedbackDuration?: number | ((correct: boolean) => number);
  mistakeAllowance?: number;
  onAnswerEffect?: (correct: boolean) => void;
  /**
   * Called inside the feedback-timeout callback right before the next question
   * is generated and `showFeedback` is cleared. Consumers should reset any
   * per-question selection state from here so that React 18+ auto-batching
   * commits the consumer's reset and the new question in the same render —
   * preventing a one-render gap where stale selections coexist with a fresh
   * question (which can re-trigger auto-submit `useEffect`s).
   *
   * @param lastCorrect Whether the answer that just finished its feedback flash
   * was correct. Lets consumers branch on outcome (e.g. log streaks, vary
   * reset behavior) without needing a parallel ref.
   *
   * If `onAdvance` throws, the error is logged via `console.error` and the
   * advance proceeds anyway — the session must never get stuck in feedback
   * state because of a consumer-side fault.
   */
  onAdvance?: (lastCorrect: boolean) => void;
};

export type UseTimedSessionReturn<TQuestion> = {
  currentQuestion: TQuestion | null;
  isPlaying: boolean;
  isPaused: boolean;
  countdown: number | null;
  timeElapsed: number;
  timeRemaining: number;
  totalTime: number;
  correctCount: number;
  incorrectCount: number;
  totalCount: number;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  isFinished: boolean;
  /**
   * Seconds spent on each completed question, in order. The currently shown
   * question has no entry yet. Quiz hooks pass this straight to
   * `computePracticeResult` instead of each tracking timing themselves.
   */
  questionTimes: number[];
  handleAnswer: (correct: boolean) => void;
  togglePause: () => void;
  /**
   * Ends the session immediately at its current score, exactly as if the time
   * limit had been reached. Used by the "quit" flow so an aborted run lands on
   * the same result/feedback screen as a fully-completed one. Idempotent and a
   * no-op once the session is already finished.
   */
  finishSession: () => void;
};

const DEFAULT_FEEDBACK_DURATION = 500;

/** Resolve the feedback-duration config (a constant or an outcome-keyed fn). */
function resolveFeedbackDuration(
  feedbackDuration: number | ((correct: boolean) => number),
  correct: boolean,
): number {
  return typeof feedbackDuration === "function"
    ? feedbackDuration(correct)
    : feedbackDuration;
}

export function useTimedSession<TQuestion>(
  config: UseTimedSessionConfig<TQuestion>,
): UseTimedSessionReturn<TQuestion> {
  const {
    timeLimit,
    generateQuestion,
    feedbackDuration = DEFAULT_FEEDBACK_DURATION,
    mistakeAllowance,
    onAnswerEffect,
    onAdvance,
  } = config;

  const generateQuestionRef = useRef(generateQuestion);
  generateQuestionRef.current = generateQuestion;

  const feedbackDurationRef = useRef(feedbackDuration);
  feedbackDurationRef.current = feedbackDuration;

  const onAnswerEffectRef = useRef(onAnswerEffect);
  onAnswerEffectRef.current = onAnswerEffect;

  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  const [currentQuestion, setCurrentQuestion] = useState<TQuestion | null>(
    null,
  );
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(
    null,
  );
  const [isFinished, setIsFinished] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const hasStarted = useRef(false);
  const isFinishedRef = useRef(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Per-question timing lives here so quiz hooks don't each reimplement it.
  const questionTimesRef = useRef<number[]>([]);
  const questionStartRef = useRef<number>(Date.now());

  // Records how long the previous question was shown, then generates the next.
  const advanceQuestion = useCallback((): TQuestion => {
    questionTimesRef.current.push(
      (Date.now() - questionStartRef.current) / 1000,
    );
    questionStartRef.current = Date.now();
    return generateQuestionRef.current();
  }, []);

  const { countdown } = useCountdown();

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setCurrentQuestion(advanceQuestion());
  }, [advanceQuestion]);

  const isPlaying =
    currentQuestion !== null &&
    !isFinished &&
    countdown === null &&
    !showFeedback &&
    !isPaused;

  const { timeElapsed, totalTime } = useGameTimer({
    timeLimit,
    isActive: isPlaying,
    onTimeLimitReached: useCallback(() => {
      isFinishedRef.current = true;
      setIsFinished(true);
    }, []),
  });

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const togglePause = useCallback(() => {
    if (isFinished || countdown !== null) return;
    setIsPaused((prev) => !prev);
  }, [isFinished, countdown]);

  // End the session on demand (e.g. the user quits mid-run). Clears any pending
  // feedback/advance timeout so a flash in flight can't resurrect the run after
  // it has been marked finished.
  const finishSession = useCallback(() => {
    if (isFinishedRef.current) return;
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    isFinishedRef.current = true;
    setIsFinished(true);
    setShowFeedback(false);
  }, []);

  // End the session after the feedback flash for the answer that hit the
  // mistake limit. `onAdvance` is intentionally NOT called — there is no next
  // question.
  const scheduleFinish = useCallback((duration: number) => {
    feedbackTimeoutRef.current = setTimeout(() => {
      isFinishedRef.current = true;
      setIsFinished(true);
      setShowFeedback(false);
    }, duration);
  }, []);

  // Advance to the next question after the feedback flash.
  const scheduleAdvance = useCallback(
    (duration: number, correct: boolean) => {
      feedbackTimeoutRef.current = setTimeout(() => {
        if (isFinishedRef.current) return;
        // see UseTimedSessionConfig.onAdvance for batching contract
        try {
          onAdvanceRef.current?.(correct);
        } catch (error) {
          console.error(
            "useTimedSession: onAdvance threw, continuing advance:",
            error,
          );
        }
        setCurrentQuestion(advanceQuestion());
        setShowFeedback(false);
        setLastAnswerCorrect(null);
      }, duration);
    },
    [advanceQuestion],
  );

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (isFinished || countdown !== null || showFeedback || isPaused) return;

      onAnswerEffectRef.current?.(correct);
      setLastAnswerCorrect(correct);
      setShowFeedback(true);

      const newIncorrectCount = correct ? incorrectCount : incorrectCount + 1;

      if (correct) {
        setCorrectCount((prev) => prev + 1);
      } else {
        setIncorrectCount((prev) => prev + 1);
      }

      const duration = resolveFeedbackDuration(
        feedbackDurationRef.current,
        correct,
      );
      const mistakeLimitReached =
        mistakeAllowance !== undefined && newIncorrectCount >= mistakeAllowance;

      if (mistakeLimitReached) {
        scheduleFinish(duration);
      } else {
        scheduleAdvance(duration, correct);
      }
    },
    [
      isFinished,
      countdown,
      showFeedback,
      isPaused,
      incorrectCount,
      mistakeAllowance,
      scheduleFinish,
      scheduleAdvance,
    ],
  );

  const timeRemaining = Math.max(0, timeLimit - timeElapsed);

  return {
    currentQuestion,
    isPlaying,
    isPaused,
    countdown,
    timeElapsed,
    timeRemaining,
    totalTime,
    correctCount,
    incorrectCount,
    totalCount: correctCount + incorrectCount,
    showFeedback,
    lastAnswerCorrect,
    isFinished,
    questionTimes: questionTimesRef.current,
    handleAnswer,
    togglePause,
    finishSession,
  };
}
