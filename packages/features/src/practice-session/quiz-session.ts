import type { RemoteChallengePort } from "../challenge-attempt/types";
import type {
  TimedSessionFinishReason,
  UseTimedSessionReturn,
} from "./use-timed-session";

/**
 * Config fields shared by every timed quiz session hook. Individual hooks
 * intersect this with their own extras (selected pieces, orientation, etc.).
 * `TQuestion` types the optional `remote` port; hooks that never run remote
 * can leave it at its default.
 */
export type TimedQuizSessionConfig<TResult, TQuestion = unknown> = {
  timeLimit: number;
  mistakeAllowance?: number;
  onAnswerEffect?: (correct: boolean) => void;
  onComplete?: (result: TResult) => void;
  /** Passed through to `useTimedSession`; see its `remote` config. */
  remote?: RemoteChallengePort<TQuestion>;
  /** Passed through to `useTimedSession`; see its `disablePause` config. */
  disablePause?: boolean;
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
  /**
   * Why the timed session ended; `null` while it runs. A hook that ends the
   * run on its own terms (route planner's `problemCount`) overrides
   * `isFinished` but leaves this `null`, since no timer reason applies.
   */
  finishReason: TimedSessionFinishReason | null;
  isPaused: boolean;
  /** See `UseTimedSessionReturn.remoteFailed`. */
  remoteFailed: boolean;
  /** See `UseTimedSessionReturn.awaitingServer`. */
  awaitingServer: boolean;
  togglePause: () => void;
  finishSession: () => void;
};

/**
 * True while answer input must be ignored: during the pre-session countdown,
 * while paused, during the feedback flash, while a remote session waits for
 * the server's next question, or once the session has finished. Accepts any
 * facade-shaped object (a `useTimedSession` return value works).
 */
export function isInputBlocked(
  state: Pick<
    TimedSessionFacade,
    "isFinished" | "countdown" | "isPaused" | "showFeedback" | "awaitingServer"
  >,
): boolean {
  return (
    state.isFinished ||
    state.countdown !== null ||
    state.isPaused ||
    state.showFeedback ||
    state.awaitingServer
  );
}

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
    finishReason: session.finishReason,
    isPaused: session.isPaused,
    remoteFailed: session.remoteFailed,
    awaitingServer: session.awaitingServer,
    togglePause: session.togglePause,
    finishSession: session.finishSession,
  };
}
