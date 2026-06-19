import type { UseTimedSessionReturn } from "./use-timed-session";

/**
 * Config fields shared by every timed quiz session hook. Individual hooks
 * intersect this with their own extras (selected pieces, orientation, etc.).
 */
export type TimedQuizSessionConfig<TResult> = {
  timeLimit: number;
  mistakeAllowance?: number;
  onAnswerEffect?: (correct: boolean) => void;
  onComplete?: (result: TResult) => void;
};

/**
 * The subset of `useTimedSession` state that every quiz session hook re-exposes
 * verbatim. Hooks intersect this with their feature-specific fields (current
 * question, custom handlers, etc.).
 */
export type TimedSessionFacade = {
  countdown: number | null;
  timeElapsed: number;
  timeRemaining: number;
  correctCount: number;
  incorrectCount: number;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  isFinished: boolean;
  isPaused: boolean;
  togglePause: () => void;
  finishSession: () => void;
};

/** Project a `useTimedSession` return value down to the shared facade fields. */
export function toTimedSessionFacade(
  session: UseTimedSessionReturn<unknown>,
): TimedSessionFacade {
  return {
    countdown: session.countdown,
    timeElapsed: session.timeElapsed,
    timeRemaining: session.timeRemaining,
    correctCount: session.correctCount,
    incorrectCount: session.incorrectCount,
    showFeedback: session.showFeedback,
    lastAnswerCorrect: session.lastAnswerCorrect,
    isFinished: session.isFinished,
    isPaused: session.isPaused,
    togglePause: session.togglePause,
    finishSession: session.finishSession,
  };
}
