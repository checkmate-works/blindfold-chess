/**
 * State transitions of a server-run challenge attempt, as pure functions.
 *
 * Nothing here reads the database or a clock: the caller loads the attempt
 * row (under a row lock), reads the server time, passes both in, and writes
 * back whatever state comes out. Keeping the rules free of I/O lets them be
 * tested without a database, and lets another platform that starts storing
 * challenge results (mobile) apply exactly the same rules.
 *
 * ## The clock is the server's
 *
 * The time limit counts only thinking time: the clock runs while a question
 * is awaiting an answer and stops during the countdown and the feedback flash,
 * as it always has on the client. The server reproduces that with its own
 * timestamps. When an answer arrives, the thinking time for that question is
 * closed at the arrival time; the clock for the next question resumes
 * `feedbackMs` later, or when the server finished processing the answer if
 * that took longer. As long as the round trip is shorter than the feedback
 * flash, network time never counts as thinking time. When it is longer, the
 * difference does count: the moment the player pressed the answer is only
 * known from the client's own claim, which the server does not trust.
 *
 * ## What this does not stop
 *
 * An automated player that answers correctly, but no faster than the
 * module's mean-thinking-time floor, is not refused. Every module's correct
 * answer can be computed from the question itself, so the server has nothing
 * that tells such a player apart from a fast human. The per-answer thinking
 * times stored on the row (server-measured) are what operators can review
 * when a result looks suspicious.
 *
 * Nor is the feedback flash enforced as time spent not looking at the next
 * question. The response to an answer carries the next question, and the
 * clock for it resumes only `feedbackMs` later, so a modified client can show
 * that question at once and think for the length of the flash (less the round
 * trip) with the clock stopped: up to 2 seconds after a wrong answer in the
 * modules that dwell on the solution, and whatever feedback speed the player
 * picked in the coordinate quiz. The unmodified client shows the flash
 * instead. Closing the gap would take a second request for each question,
 * sent when the flash ends, and its round trip would then be charged to every
 * honest player's thinking time. The mean-thinking-time floor still applies
 * to such a run, because the thinking it hides is measured as zero.
 */
import type {
  ChallengeAnswerDecision,
  ChallengeAnswerRecord,
  ChallengeAnswerResponse,
  ChallengeAttemptState,
  ChallengeFinishDecision,
  ChallengeModuleDefinition,
} from "./types";

import {
  ATTEMPT_MAX_AGE_MS,
  COUNTDOWN_TOTAL_MS,
  EARLY_ANSWER_TOLERANCE_MS,
  END_TOLERANCE_MS,
  MIN_ANSWERS_FOR_SPEED_CHECK,
  START_GRACE_MS,
} from "./constants";

/**
 * Everything a transition needs about one attempt. Times are server epoch ms.
 */
export type ChallengeAttemptContext<TSettings, TQuestion, TAnswer> = {
  definition: ChallengeModuleDefinition<TSettings, TQuestion, TAnswer>;
  settings: TSettings;
  /** The full question list generated when the attempt started. */
  questions: readonly TQuestion[];
  state: ChallengeAttemptState;
  /** Whether the row has already been finished (recorded or not). */
  consumed: boolean;
  startedAt: number;
  timeLimitMs: number;
  mistakeLimit: number;
};

/**
 * The state of an attempt created at `now`. The first question's clock does
 * not run until the client's countdown is over, plus a grace period for the
 * start response's trip to the client.
 */
export function startedAttemptState(now: number): ChallengeAttemptState {
  return {
    sequence: 0,
    score: 0,
    incorrectAnswers: 0,
    elapsedMs: 0,
    resumedAt: now + COUNTDOWN_TOTAL_MS + START_GRACE_MS,
    answers: [],
  };
}

/**
 * Thinking time consumed by `now`: the time banked up to the last accepted
 * answer, plus the time the current question has been awaiting an answer.
 * Before `resumedAt` (countdown or feedback flash) the clock is stopped.
 */
export function attemptElapsed(
  state: ChallengeAttemptState,
  now: number,
): number {
  return state.elapsedMs + Math.max(0, now - state.resumedAt);
}

/**
 * Judges one submitted answer against the attempt row.
 *
 * `sequence` and `rawAnswer` come straight from the client, so they are typed
 * `unknown` and checked here. `receivedAt` is when the server received the
 * answer; `respondedAt` is when it will have finished processing it, which
 * the next question's clock may not resume before.
 *
 * The row can be answered once per question. A resend of the previous answer
 * (the response was lost in transit) gets the same response again, even
 * after the row is finished, so a retry never grades the same answer twice;
 * a different answer for that question is rejected, so an answer cannot be
 * swapped after seeing whether it was right.
 */
export function decideAnswer<TSettings, TQuestion, TAnswer>(
  ctx: ChallengeAttemptContext<TSettings, TQuestion, TAnswer>,
  sequence: unknown,
  rawAnswer: unknown,
  receivedAt: number,
  respondedAt: number,
): ChallengeAnswerDecision<TQuestion> {
  const { definition, settings, questions, state } = ctx;

  if (typeof sequence !== "number" || !Number.isInteger(sequence)) {
    return { kind: "rejected" };
  }

  if (sequence === state.sequence - 1) {
    const last = state.answers.at(-1);
    if (last === undefined) return { kind: "rejected" };
    const answer = definition.parseAnswer(rawAnswer);
    if (answer === null || !jsonEqual(answer, last.answer)) {
      return { kind: "rejected" };
    }
    return {
      kind: "replay",
      response: acceptedResponse(ctx, state, last),
    };
  }

  if (
    ctx.consumed ||
    receivedAt - ctx.startedAt > ATTEMPT_MAX_AGE_MS ||
    sequence !== state.sequence ||
    state.incorrectAnswers >= ctx.mistakeLimit ||
    sequence >= questions.length
  ) {
    return { kind: "rejected" };
  }

  if (receivedAt < state.resumedAt - EARLY_ANSWER_TOLERANCE_MS) {
    return { kind: "rejected" };
  }

  // The arrival grace belongs to the last in-time answer, not to every
  // subsequent question. Otherwise early answers during each feedback grace
  // add zero thinking time and can keep scoring after the budget is spent.
  if (
    state.elapsedMs >= ctx.timeLimitMs ||
    attemptElapsed(state, receivedAt) >= ctx.timeLimitMs + END_TOLERANCE_MS
  ) {
    return { kind: "expired" };
  }

  const answer = definition.parseAnswer(rawAnswer);
  if (answer === null) return { kind: "rejected" };

  const correct = definition.grade(questions[sequence], answer);
  const thinkMs = Math.max(0, receivedAt - state.resumedAt);
  const elapsedMs = state.elapsedMs + thinkMs;
  const record: ChallengeAnswerRecord = {
    answer,
    correct,
    thinkMs,
    receivedAt,
    elapsedMs,
  };
  const next: ChallengeAttemptState = {
    sequence: sequence + 1,
    score: state.score + (correct ? 1 : 0),
    incorrectAnswers: state.incorrectAnswers + (correct ? 0 : 1),
    elapsedMs,
    resumedAt: Math.max(
      receivedAt + definition.feedbackMs(settings, correct),
      respondedAt,
    ),
    answers: [...state.answers, record],
  };

  return {
    kind: "accepted",
    state: next,
    response: acceptedResponse(ctx, next, record),
  };
}

/**
 * Judges a request to finish the attempt.
 *
 * The caller handles a consumed row before calling this: it returns the
 * result saved when the row was finished, so a resent finish request gets the
 * same outcome. Called on a consumed row anyway, this rejects rather than
 * deciding a second time.
 *
 * There is no early finish. Ties on score rank the shorter time first, so a
 * run finished early would look faster than one that played the full minute.
 * Until the mistake limit, the time limit, or the end of the question list is
 * reached, the answer is `pending` with the time left, and the client waits
 * and asks again.
 */
export function decideFinish<TSettings, TQuestion, TAnswer>(
  ctx: ChallengeAttemptContext<TSettings, TQuestion, TAnswer>,
  now: number,
): ChallengeFinishDecision {
  const { state } = ctx;

  if (ctx.consumed || now - ctx.startedAt > ATTEMPT_MAX_AGE_MS) {
    return { kind: "rejected" };
  }

  const endedByMistakes = state.incorrectAnswers >= ctx.mistakeLimit;
  const outOfQuestions = state.sequence >= ctx.questions.length;
  const elapsed = attemptElapsed(state, now);
  if (!endedByMistakes && !outOfQuestions && elapsed < ctx.timeLimitMs) {
    return { kind: "pending", remainingMs: ctx.timeLimitMs - elapsed };
  }

  const answerCount = state.answers.length;
  if (answerCount === 0) return { kind: "unrecorded" };

  if (
    answerCount >= MIN_ANSWERS_FOR_SPEED_CHECK &&
    state.elapsedMs / answerCount < ctx.definition.minMeanThinkMs
  ) {
    return { kind: "refused", reason: "implausible_speed" };
  }

  const limitSeconds = Math.floor(ctx.timeLimitMs / 1000);
  return {
    kind: "recorded",
    score: state.score,
    incorrectAnswers: state.incorrectAnswers,
    timeTaken: endedByMistakes
      ? Math.min(limitSeconds, Math.floor(state.elapsedMs / 1000))
      : limitSeconds,
  };
}

/**
 * The response for an accepted answer, built from that answer's record and
 * the state right after it. A replay passes the current state, which is the
 * state right after the last answer, so it rebuilds the original response.
 */
function acceptedResponse<TSettings, TQuestion, TAnswer>(
  ctx: ChallengeAttemptContext<TSettings, TQuestion, TAnswer>,
  state: ChallengeAttemptState,
  record: ChallengeAnswerRecord,
): ChallengeAnswerResponse<TQuestion> {
  const over =
    state.incorrectAnswers >= ctx.mistakeLimit ||
    state.sequence >= ctx.questions.length;
  const feedbackExtensionMs = Math.max(
    0,
    state.resumedAt -
      record.receivedAt -
      ctx.definition.feedbackMs(ctx.settings, record.correct),
  );
  return {
    status: "accepted",
    correct: record.correct,
    elapsedMs: record.elapsedMs,
    ...(feedbackExtensionMs > 0 ? { feedbackExtensionMs } : {}),
    next: over
      ? null
      : { sequence: state.sequence, question: ctx.questions[state.sequence] },
  };
}

/**
 * Equality of two values as they would be stored in a JSON column.
 *
 * The stored answer has been through jsonb, which drops `undefined` keys and
 * does not keep object key order, so both sides are serialised to JSON with
 * every object's keys sorted and the two strings are compared.
 */
function jsonEqual(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

function canonicalJson(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, nested: unknown) =>
    typeof nested === "object" && nested !== null && !Array.isArray(nested)
      ? Object.fromEntries(
          Object.entries(nested).sort(([a], [b]) => (a < b ? -1 : 1)),
        )
      : nested,
  );
}
