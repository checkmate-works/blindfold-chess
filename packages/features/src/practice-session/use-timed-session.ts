"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useLatestRef } from "../common/use-latest-ref";
import { useCountdown } from "./use-countdown";
import { useGameTimer } from "./use-game-timer";

export type UseTimedSessionConfig<TQuestion> = {
  /** Session length in seconds of active play (see {@link useTimedSession}). */
  timeLimit: number;
  /** Called once on mount and once per advance; read through a latest-ref. */
  generateQuestion: () => TQuestion;
  /** Feedback-flash length in ms, or a function of the answer's outcome. Default 500. */
  feedbackDuration?: number | ((correct: boolean) => number);
  /**
   * The session ends (after the feedback flash) on the answer that brings
   * `incorrectCount` up to this value — so `3` ends the run on the third
   * mistake. `undefined` means mistakes never end the run.
   */
  mistakeAllowance?: number;
  /** Fired synchronously inside `handleAnswer`, before any state update (e.g. sound/haptics). */
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

/**
 * Why a session ended. `timeUp` is the only one that leaves the question on
 * screen unanswered — the timer runs only while a question awaits an answer,
 * so the limit can never land mid-feedback. `mistakeLimit` ends right after
 * the answer that used up the allowance, and `quit` is the player abandoning
 * the run; neither leaves a question the player ran out of time on.
 */
export type TimedSessionFinishReason = "timeUp" | "mistakeLimit" | "quit";

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
  /** Why the session ended; `null` while it is still running. */
  finishReason: TimedSessionFinishReason | null;
  /**
   * Seconds each answered question took, in answer order: exactly one entry
   * per accepted `handleAnswer` call, so its length always equals
   * `totalCount`. Each entry is wall-clock time from when the question became
   * answerable (the countdown ending, for the first question; the previous
   * feedback flash ending, for the rest) to the answer, so it excludes the
   * countdown and feedback flashes but includes any pause taken while the
   * question was shown. The question left on screen by the time limit or a
   * quit gets no entry. Quiz hooks pass this straight to
   * `computePracticeResult` instead of each tracking timing themselves.
   */
  questionTimes: number[];
  /** Ignored during the countdown, the feedback flash, a pause, or after finishing. */
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

/**
 * The timer/scoring core shared by every timed quiz hook. The first question
 * is generated on mount, then the {@link useCountdown} pre-roll runs. The
 * clock advances only while a question awaits an answer — it is stopped
 * during the countdown, the feedback flash after each answer, and while
 * paused — so `timeLimit` measures thinking time, not wall time.
 * `timeElapsed` / `timeRemaining` are whole seconds.
 */
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

  const generateQuestionRef = useLatestRef(generateQuestion);
  const feedbackDurationRef = useLatestRef(feedbackDuration);
  const onAnswerEffectRef = useLatestRef(onAnswerEffect);
  const onAdvanceRef = useLatestRef(onAdvance);

  const [currentQuestion, setCurrentQuestion] = useState<TQuestion | null>(
    null,
  );
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(
    null,
  );
  const [finishReason, setFinishReason] =
    useState<TimedSessionFinishReason | null>(null);
  const isFinished = finishReason !== null;
  const [isPaused, setIsPaused] = useState(false);

  const hasStarted = useRef(false);
  const isFinishedRef = useRef(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Per-question timing lives here so quiz hooks don't each reimplement it.
  // State rather than a ref: the array is part of the return value, so pushing
  // into a ref during callbacks and handing out `ref.current` would expose an
  // array that mutates in place under a `number[]` type that promises a plain
  // snapshot (and reading a ref during render is itself disallowed).
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  // When the current question became answerable. An entry is pushed only from
  // `handleAnswer`, so there is exactly one per answer whatever ends the
  // session — recording on question generation instead would add a ~0 entry
  // for the first question and drop the answer that hits the mistake limit.
  const questionStartRef = useRef<number>(Date.now());

  // Starts the clock for a new question and generates it.
  const advanceQuestion = useCallback((): TQuestion => {
    questionStartRef.current = Date.now();
    return generateQuestionRef.current();
  }, [generateQuestionRef]);

  const { countdown } = useCountdown();

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setCurrentQuestion(advanceQuestion());
  }, [advanceQuestion]);

  // The first question is generated on mount but cannot be answered until the
  // countdown ends; restart its clock then so the countdown is not counted as
  // time spent on it.
  useEffect(() => {
    if (countdown === null) questionStartRef.current = Date.now();
  }, [countdown]);

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
      setFinishReason("timeUp");
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
    setFinishReason("quit");
    setShowFeedback(false);
  }, []);

  // End the session after the feedback flash for the answer that hit the
  // mistake limit. `onAdvance` is intentionally NOT called — there is no next
  // question.
  const scheduleFinish = useCallback((duration: number) => {
    feedbackTimeoutRef.current = setTimeout(() => {
      isFinishedRef.current = true;
      setFinishReason("mistakeLimit");
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

      // Computed here, not inside the updater: React may run the updater
      // later, after `advanceQuestion` has already moved the start forward.
      const seconds = (Date.now() - questionStartRef.current) / 1000;
      setQuestionTimes((prev) => [...prev, seconds]);

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
    finishReason,
    questionTimes,
    handleAnswer,
    togglePause,
    finishSession,
  };
}
