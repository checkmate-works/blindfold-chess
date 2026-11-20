"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ChallengeAnswerResponse,
  RemoteChallengePort,
} from "../challenge-attempt/types";
import { DEFAULT_FEEDBACK_MS } from "../common/flash-policy";
import { useLatestRef } from "../common/use-latest-ref";
import { useCountdown } from "./use-countdown";
import { useGameTimer } from "./use-game-timer";

export type UseTimedSessionConfig<TQuestion> = {
  /** Session length in seconds of active play (see {@link useTimedSession}). */
  timeLimit: number;
  /**
   * Called once on mount and once per advance; read through a latest-ref.
   * Never called in remote mode, where the server supplies every question.
   */
  generateQuestion: () => TQuestion;
  /**
   * Hand question delivery and grading to a server ("remote mode"). Read on
   * mount only: a session is remote or local for its whole life, so passing
   * or dropping this later has no effect. The port's `submitAnswer` is read
   * through a latest-ref, so its identity may change between renders.
   *
   * In remote mode:
   *
   * - The first question is `remote.first.question`; `generateQuestion` is
   *   not called.
   * - An answer flashes feedback and updates the counts at once
   *   (optimistically) while `submitAnswer(sequence, answer)` is sent. The
   *   next question appears only once the feedback flash is over AND the
   *   server's response has arrived; between the two, `awaitingServer` is
   *   true and input is ignored.
   * - The clock follows the server's rule for thinking time: the server stops
   *   the clock when it receives an answer and restarts it `feedbackMs` later,
   *   or after server processing if it takes longer. So the on-screen
   *   clock stops only for `feedbackDuration` after an answer and then runs
   *   again even while the response is outstanding. When an `accepted`
   *   response arrives, the clock is re-synced to its `elapsedMs` plus however
   *   long the wait has already run past the feedback flash for the server's
   *   verdict (which is what the server waited out, even when the flash on
   *   screen was for a different local verdict), excluding the server's
   *   reported processing extension. Counting time any
   *   other way would let an answer that looks in time on screen arrive after
   *   the server's limit.
   * - The server's grading wins: if its verdict differs from the local one
   *   the counts are corrected, and the run continues as long as the response
   *   carries a `next` question even if the local mistake count says
   *   otherwise. `mistakeAllowance` is not consulted; `next: null` ends the
   *   run after the feedback flash with reason `mistakeLimit`.
   * - `expired` takes the answer back out of the counts and ends the run at
   *   once with reason `timeUp`.
   * - `rejected`, or `submitAnswer` failing three times in a row (each retry
   *   resends the same `sequence` and `answer`), takes the answer back out,
   *   ends the run with reason `quit`, and sets `remoteFailed`.
   * - At the local time limit, an outstanding answer is settled before the
   *   run can finish. Otherwise an expired answer would remain counted and
   *   finishing could race its still-pending server transaction.
   */
  remote?: RemoteChallengePort<TQuestion>;
  /**
   * Make `togglePause` a no-op. Challenges set it: time spent paused is not
   * thinking time, so a pause would let a player stop the clock and think
   * with the question still on screen — and a 60-second contest has no need
   * for one. A "really quit?" prompt opened from such a session must leave
   * the clock running.
   */
  disablePause?: boolean;
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
  /**
   * True once a remote session has ended because the server refused an
   * answer (`rejected`) or could not be reached for three attempts in a row.
   * Such a run is not recorded: its score could only come from the client's
   * own grading, which is exactly what a server-run challenge must not trust,
   * so the caller ends it and says so rather than keeping a result it cannot
   * stand behind. Always false in local mode.
   */
  remoteFailed: boolean;
  /**
   * Remote mode only: the feedback flash is over but the server's response
   * (and so the next question) has not arrived yet. The clock runs, input is
   * ignored, and `isPlaying` is false. Always false in local mode.
   */
  awaitingServer: boolean;
  /**
   * Ignored during the countdown, the feedback flash, a pause, while awaiting
   * the server, or after finishing. `answer` is the raw answer sent to the
   * server in remote mode; local mode ignores it.
   */
  handleAnswer: (correct: boolean, answer?: unknown) => void;
  /** No-op when `disablePause` is set. */
  togglePause: () => void;
  /**
   * Ends the session immediately at its current score, exactly as if the time
   * limit had been reached. Used by the "quit" flow so an aborted run lands on
   * the same result/feedback screen as a fully-completed one. Idempotent and a
   * no-op once the session is already finished.
   */
  finishSession: () => void;
};

/** Attempts per answer before a remote session gives up (`remoteFailed`). */
const REMOTE_SUBMIT_ATTEMPTS = 3;
/** Wait between failed attempts, so a brief network blip does not end the run. */
const REMOTE_RETRY_DELAY_MS = 500;

/**
 * One answer in flight in remote mode. The next question is shown only when
 * both halves are in: the feedback flash has run out (`feedbackDone`) and
 * the server has accepted the answer (`outcome`).
 */
type PendingRemoteAnswer<TQuestion> = {
  /** The local verdict, already added to the counts. */
  correct: boolean;
  answeredAt: number;
  feedbackDone: boolean;
  outcome?: {
    correct: boolean;
    next: { sequence: number; question: TQuestion } | null;
  };
};

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
 *
 * With `remote` set, the server supplies the questions and grades the
 * answers, and the clock also runs while the next question is on its way;
 * see {@link UseTimedSessionConfig.remote}.
 */
export function useTimedSession<TQuestion>(
  config: UseTimedSessionConfig<TQuestion>,
): UseTimedSessionReturn<TQuestion> {
  const {
    timeLimit,
    generateQuestion,
    feedbackDuration = DEFAULT_FEEDBACK_MS,
    mistakeAllowance,
    onAnswerEffect,
    onAdvance,
    disablePause = false,
  } = config;

  const generateQuestionRef = useLatestRef(generateQuestion);
  const feedbackDurationRef = useLatestRef(feedbackDuration);
  const onAnswerEffectRef = useLatestRef(onAnswerEffect);
  const onAdvanceRef = useLatestRef(onAdvance);
  const remoteRef = useLatestRef(config.remote);
  // Captured once: a session does not switch between local and remote.
  const [remoteFirst] = useState(() => config.remote?.first);
  const isRemote = remoteFirst !== undefined;

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
  const [awaitingServer, setAwaitingServer] = useState(false);
  const [remoteFailed, setRemoteFailed] = useState(false);
  const [waitingAtTimeLimit, setWaitingAtTimeLimit] = useState(false);

  const hasStarted = useRef(false);
  const isFinishedRef = useRef(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // Remote mode: the sequence number of the question on screen, and the
  // answer whose response is outstanding. A response is applied only while
  // its answer is still `pendingRef.current` and the hook is mounted, so a
  // late response cannot touch a finished or unmounted session.
  const sequenceRef = useRef(0);
  const pendingRef = useRef<PendingRemoteAnswer<TQuestion> | null>(null);
  const mountedRef = useRef(false);

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
  const questionStartRef = useRef<number>(performance.now());

  // Starts the clock for a new question and generates it.
  const advanceQuestion = useCallback((): TQuestion => {
    questionStartRef.current = performance.now();
    return generateQuestionRef.current();
  }, [generateQuestionRef]);

  const { countdown } = useCountdown();

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    if (remoteFirst !== undefined) {
      sequenceRef.current = remoteFirst.sequence;
      questionStartRef.current = performance.now();
      setCurrentQuestion(remoteFirst.question);
      return;
    }
    setCurrentQuestion(advanceQuestion());
  }, [advanceQuestion, remoteFirst]);

  // The first question is generated on mount but cannot be answered until the
  // countdown ends; restart its clock then so the countdown is not counted as
  // time spent on it.
  useEffect(() => {
    if (countdown === null) questionStartRef.current = performance.now();
  }, [countdown]);

  // The clock runs whenever a question is (or is about to be) answerable;
  // `awaitingServer` keeps it running while input is still blocked.
  const clockRunning =
    currentQuestion !== null &&
    !isFinished &&
    !waitingAtTimeLimit &&
    countdown === null &&
    !showFeedback &&
    !isPaused;
  const isPlaying = clockRunning && !awaitingServer;

  const { timeElapsed, totalTime, setElapsedMs } = useGameTimer({
    timeLimit,
    isActive: clockRunning,
    onTimeLimitReached: useCallback(() => {
      if (pendingRef.current !== null) {
        // Keep the answer live until its verdict arrives. Pausing this local
        // timer also lets setElapsedMs restart it from the server's verdict
        // if processing time made our estimate reach zero too early.
        setWaitingAtTimeLimit(true);
        return;
      }
      isFinishedRef.current = true;
      pendingRef.current = null;
      setAwaitingServer(false);
      setFinishReason("timeUp");
    }, []),
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const togglePause = useCallback(() => {
    if (disablePause || isFinished || countdown !== null) return;
    setIsPaused((prev) => !prev);
  }, [disablePause, isFinished, countdown]);

  // Ends the run now: no pending flash or server response can act on it after
  // this.
  const endSession = useCallback((reason: TimedSessionFinishReason) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    isFinishedRef.current = true;
    pendingRef.current = null;
    setFinishReason(reason);
    setShowFeedback(false);
    setAwaitingServer(false);
  }, []);

  // End the session on demand (e.g. the user quits mid-run). Clears any pending
  // feedback/advance timeout so a flash in flight can't resurrect the run after
  // it has been marked finished.
  const finishSession = useCallback(() => {
    if (isFinishedRef.current) return;
    endSession("quit");
  }, [endSession]);

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

  // see UseTimedSessionConfig.onAdvance for the batching contract
  const notifyAdvance = useCallback(
    (lastCorrect: boolean) => {
      try {
        onAdvanceRef.current?.(lastCorrect);
      } catch (error) {
        console.error(
          "useTimedSession: onAdvance threw, continuing advance:",
          error,
        );
      }
    },
    [onAdvanceRef],
  );

  // Advance to the next question after the feedback flash.
  const scheduleAdvance = useCallback(
    (duration: number, correct: boolean) => {
      feedbackTimeoutRef.current = setTimeout(() => {
        if (isFinishedRef.current) return;
        notifyAdvance(correct);
        setCurrentQuestion(advanceQuestion());
        setShowFeedback(false);
        setLastAnswerCorrect(null);
      }, duration);
    },
    [advanceQuestion, notifyAdvance],
  );

  // Remote mode: both the flash and the accepted response are in, so show
  // the server's next question, or end the run when there is none.
  const completeRemoteAnswer = useCallback(
    (pending: PendingRemoteAnswer<TQuestion>) => {
      const { outcome } = pending;
      if (outcome === undefined) return;
      pendingRef.current = null;
      setAwaitingServer(false);
      if (outcome.next === null) {
        isFinishedRef.current = true;
        setFinishReason("mistakeLimit");
        setShowFeedback(false);
        return;
      }
      sequenceRef.current = outcome.next.sequence;
      notifyAdvance(outcome.correct);
      questionStartRef.current = performance.now();
      setCurrentQuestion(outcome.next.question);
      setShowFeedback(false);
      setLastAnswerCorrect(null);
    },
    [notifyAdvance],
  );

  // Take an optimistically counted answer back out (the server did not count it).
  const revertAnswer = useCallback((correct: boolean) => {
    if (correct) {
      setCorrectCount((prev) => prev - 1);
    } else {
      setIncorrectCount((prev) => prev - 1);
    }
    setQuestionTimes((prev) => prev.slice(0, -1));
  }, []);

  const submitRemoteAnswer = useCallback(
    async (
      pending: PendingRemoteAnswer<TQuestion>,
      sequence: number,
      answer: unknown,
    ) => {
      const isCurrent = () =>
        mountedRef.current &&
        !isFinishedRef.current &&
        pendingRef.current === pending;

      let response: ChallengeAnswerResponse<TQuestion> | null = null;
      for (let attempt = 1; attempt <= REMOTE_SUBMIT_ATTEMPTS; attempt++) {
        const port = remoteRef.current;
        if (port === undefined) break;
        try {
          response = await port.submitAnswer(sequence, answer);
          break;
        } catch {
          if (attempt === REMOTE_SUBMIT_ATTEMPTS) break;
          await new Promise((resolve) =>
            setTimeout(resolve, REMOTE_RETRY_DELAY_MS),
          );
          if (!isCurrent()) return;
        }
      }
      if (!isCurrent()) return;

      if (response === null || response.status === "rejected") {
        revertAnswer(pending.correct);
        setRemoteFailed(true);
        endSession("quit");
        return;
      }
      if (response.status === "expired") {
        revertAnswer(pending.correct);
        endSession("timeUp");
        return;
      }

      if (response.correct !== pending.correct) {
        const delta = response.correct ? 1 : -1;
        setCorrectCount((prev) => prev + delta);
        setIncorrectCount((prev) => prev - delta);
      }
      // The server restarted its clock after the flash for ITS verdict, so
      // when the verdicts differ the flash shown on screen is the wrong length
      // to subtract.
      const serverFeedbackMs = resolveFeedbackDuration(
        feedbackDurationRef.current,
        response.correct,
      );
      const pastFeedbackMs = Math.max(
        0,
        performance.now() -
          pending.answeredAt -
          serverFeedbackMs -
          (response.feedbackExtensionMs ?? 0),
      );
      setElapsedMs(response.elapsedMs + pastFeedbackMs);
      // Recorded on the shared pending entry (isCurrent() guarantees it is
      // `pending`) so the feedback timeout sees it if it fires later.
      const current = pendingRef.current;
      if (current === null) return;
      setWaitingAtTimeLimit(false);
      current.outcome = { correct: response.correct, next: response.next };
      if (current.feedbackDone) completeRemoteAnswer(current);
    },
    [
      remoteRef,
      feedbackDurationRef,
      revertAnswer,
      endSession,
      setElapsedMs,
      completeRemoteAnswer,
    ],
  );

  const handleAnswer = useCallback(
    (correct: boolean, answer?: unknown) => {
      if (
        isFinished ||
        countdown !== null ||
        showFeedback ||
        isPaused ||
        awaitingServer
      ) {
        return;
      }

      // Computed here, not inside the updater: React may run the updater
      // later, after `advanceQuestion` has already moved the start forward.
      const seconds = (performance.now() - questionStartRef.current) / 1000;
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

      if (isRemote) {
        const pending: PendingRemoteAnswer<TQuestion> = {
          correct,
          answeredAt: performance.now(),
          feedbackDone: false,
        };
        pendingRef.current = pending;
        feedbackTimeoutRef.current = setTimeout(() => {
          if (isFinishedRef.current || pendingRef.current !== pending) return;
          pending.feedbackDone = true;
          if (pending.outcome !== undefined) {
            completeRemoteAnswer(pending);
          } else {
            setShowFeedback(false);
            setAwaitingServer(true);
          }
        }, duration);
        void submitRemoteAnswer(pending, sequenceRef.current, answer);
        return;
      }

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
      awaitingServer,
      incorrectCount,
      mistakeAllowance,
      isRemote,
      onAnswerEffectRef,
      feedbackDurationRef,
      completeRemoteAnswer,
      submitRemoteAnswer,
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
    remoteFailed,
    awaitingServer,
    handleAnswer,
    togglePause,
    finishSession,
  };
}
