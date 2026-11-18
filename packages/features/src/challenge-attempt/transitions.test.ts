import { describe, expect, it } from "vitest";

import type { ChallengeAttemptState, ChallengeModuleDefinition } from "./types";

import {
  ATTEMPT_MAX_AGE_MS,
  COUNTDOWN_TOTAL_MS,
  EARLY_ANSWER_TOLERANCE_MS,
  END_TOLERANCE_MS,
  MIN_ANSWERS_FOR_SPEED_CHECK,
  START_GRACE_MS,
} from "./constants";
import {
  type ChallengeAttemptContext,
  attemptElapsed,
  decideAnswer,
  decideFinish,
  startedAttemptState,
} from "./transitions";

/**
 * A stand-in module: questions are integers 0-9, the answer is correct when
 * it is the same integer, and every feedback flash lasts 500ms.
 */
const FEEDBACK_MS = 500;
const MIN_MEAN_THINK_MS = 300;

const fakeDefinition: ChallengeModuleDefinition<
  Record<string, never>,
  number,
  number
> = {
  parseSettings: () => ({}),
  leaderboardKey: () => "fake",
  generateQuestions: (_settings, count) =>
    Array.from({ length: count }, (_, i) => i % 10),
  parseAnswer: (raw) =>
    typeof raw === "number" && Number.isInteger(raw) ? raw : null,
  grade: (question, answer) => question === answer,
  feedbackMs: () => FEEDBACK_MS,
  minMeanThinkMs: MIN_MEAN_THINK_MS,
  maxQuestions: 20,
};

const START = 1_000_000;
const LIMIT_MS = 60_000;
const MISTAKE_LIMIT = 3;
const FIRST_RESUME = START + COUNTDOWN_TOTAL_MS + START_GRACE_MS;

function makeContext(
  overrides: Partial<
    ChallengeAttemptContext<Record<string, never>, number, number>
  > = {},
): ChallengeAttemptContext<Record<string, never>, number, number> {
  return {
    definition: fakeDefinition,
    settings: {},
    questions: fakeDefinition.generateQuestions({}, 20),
    state: startedAttemptState(START),
    consumed: false,
    startedAt: START,
    timeLimitMs: LIMIT_MS,
    mistakeLimit: MISTAKE_LIMIT,
    ...overrides,
  };
}

/** Answers the current question after `thinkMs`, asserting it was accepted. */
function answer(
  ctx: ChallengeAttemptContext<Record<string, never>, number, number>,
  thinkMs: number,
  correct = true,
): ChallengeAttemptContext<Record<string, never>, number, number> {
  const { state, questions } = ctx;
  const question = questions[state.sequence];
  const receivedAt = state.resumedAt + thinkMs;
  const decision = decideAnswer(
    ctx,
    state.sequence,
    correct ? question : question + 1,
    receivedAt,
    receivedAt + 10,
  );
  if (decision.kind !== "accepted") {
    throw new Error(`expected accepted, got ${decision.kind}`);
  }
  return { ...ctx, state: decision.state };
}

function answerMany(
  ctx: ChallengeAttemptContext<Record<string, never>, number, number>,
  count: number,
  thinkMs: number,
): ChallengeAttemptContext<Record<string, never>, number, number> {
  let current = ctx;
  for (let i = 0; i < count; i++) current = answer(current, thinkMs);
  return current;
}

describe("startedAttemptState", () => {
  it("starts the first question's clock after the countdown and a start grace period", () => {
    const state = startedAttemptState(START);
    expect(state).toEqual({
      sequence: 0,
      score: 0,
      incorrectAnswers: 0,
      elapsedMs: 0,
      resumedAt: START + COUNTDOWN_TOTAL_MS + START_GRACE_MS,
      answers: [],
    });
  });

  it("runs the countdown for 3 seconds plus the START! display", () => {
    expect(COUNTDOWN_TOTAL_MS).toBe(3500);
  });
});

describe("attemptElapsed", () => {
  it("does not advance the clock before it resumes", () => {
    const state: ChallengeAttemptState = {
      ...startedAttemptState(START),
      elapsedMs: 1200,
    };
    expect(attemptElapsed(state, state.resumedAt - 100)).toBe(1200);
  });

  it("adds the time the current question has been waiting to the banked time", () => {
    const state: ChallengeAttemptState = {
      ...startedAttemptState(START),
      elapsedMs: 1200,
    };
    expect(attemptElapsed(state, state.resumedAt + 800)).toBe(2000);
  });
});

describe("decideAnswer", () => {
  it("accepts a correct answer, charging only the time since the clock resumed", () => {
    const ctx = makeContext();
    const receivedAt = FIRST_RESUME + 700;
    const decision = decideAnswer(ctx, 0, 0, receivedAt, receivedAt + 20);

    expect(decision).toEqual({
      kind: "accepted",
      state: {
        sequence: 1,
        score: 1,
        incorrectAnswers: 0,
        elapsedMs: 700,
        resumedAt: receivedAt + FEEDBACK_MS,
        answers: [
          {
            answer: 0,
            correct: true,
            thinkMs: 700,
            receivedAt,
            elapsedMs: 700,
          },
        ],
      },
      response: {
        status: "accepted",
        correct: true,
        elapsedMs: 700,
        next: { sequence: 1, question: 1 },
      },
    });
  });

  it("counts a wrong answer as a mistake and not as a point", () => {
    const ctx = makeContext();
    const receivedAt = FIRST_RESUME + 400;
    const decision = decideAnswer(ctx, 0, 5, receivedAt, receivedAt);

    expect(decision.kind).toBe("accepted");
    if (decision.kind !== "accepted") return;
    expect(decision.state.score).toBe(0);
    expect(decision.state.incorrectAnswers).toBe(1);
    expect(decision.response).toMatchObject({
      status: "accepted",
      correct: false,
    });
  });

  it("stops the clock for the feedback flash after an answer", () => {
    const ctx = answer(makeContext(), 1000);
    const { resumedAt } = ctx.state;
    expect(attemptElapsed(ctx.state, resumedAt)).toBe(1000);
    expect(resumedAt).toBe(FIRST_RESUME + 1000 + FEEDBACK_MS);
  });

  it("resumes the clock when the server finished processing if that took longer than the feedback flash", () => {
    const ctx = makeContext();
    const receivedAt = FIRST_RESUME + 400;
    const respondedAt = receivedAt + FEEDBACK_MS + 250;
    const decision = decideAnswer(ctx, 0, 0, receivedAt, respondedAt);

    expect(decision.kind).toBe("accepted");
    if (decision.kind !== "accepted") return;
    expect(decision.state.resumedAt).toBe(respondedAt);
  });

  it("charges no thinking time for an answer that arrives slightly before the clock resumes", () => {
    const ctx = makeContext();
    const receivedAt = FIRST_RESUME - EARLY_ANSWER_TOLERANCE_MS;
    const decision = decideAnswer(ctx, 0, 0, receivedAt, receivedAt);

    expect(decision.kind).toBe("accepted");
    if (decision.kind !== "accepted") return;
    expect(decision.state.elapsedMs).toBe(0);
    expect(decision.state.answers[0].thinkMs).toBe(0);
  });

  it("does not accept an answer sent before the feedback flash is over", () => {
    const ctx = makeContext();
    const receivedAt = FIRST_RESUME - EARLY_ANSWER_TOLERANCE_MS - 1;
    expect(decideAnswer(ctx, 0, 0, receivedAt, receivedAt)).toEqual({
      kind: "rejected",
    });
  });

  it("reports an answer that arrives after the time limit as expired", () => {
    const ctx = makeContext();
    const receivedAt = FIRST_RESUME + LIMIT_MS + END_TOLERANCE_MS;
    expect(decideAnswer(ctx, 0, 0, receivedAt, receivedAt)).toEqual({
      kind: "expired",
    });
  });

  it("accepts an answer that arrives within the end tolerance of the time limit", () => {
    const ctx = makeContext();
    const receivedAt = FIRST_RESUME + LIMIT_MS + END_TOLERANCE_MS - 1;
    expect(decideAnswer(ctx, 0, 0, receivedAt, receivedAt).kind).toBe(
      "accepted",
    );
  });

  it("does not accept an answer for a question other than the current one", () => {
    const ctx = makeContext();
    const receivedAt = FIRST_RESUME + 500;
    expect(decideAnswer(ctx, 1, 1, receivedAt, receivedAt)).toEqual({
      kind: "rejected",
    });
  });

  it.each([
    ["a string", "0"],
    ["a fraction", 0.5],
    ["null", null],
    ["missing", undefined],
  ])("does not accept a sequence that is %s", (_label, sequence) => {
    const ctx = makeContext();
    const receivedAt = FIRST_RESUME + 500;
    expect(decideAnswer(ctx, sequence, 0, receivedAt, receivedAt)).toEqual({
      kind: "rejected",
    });
  });

  it("does not accept a structurally broken answer", () => {
    const ctx = makeContext();
    const receivedAt = FIRST_RESUME + 500;
    expect(decideAnswer(ctx, 0, { value: 0 }, receivedAt, receivedAt)).toEqual({
      kind: "rejected",
    });
  });

  it("does not accept answers on a finished attempt", () => {
    const ctx = makeContext({ consumed: true });
    const receivedAt = FIRST_RESUME + 500;
    expect(decideAnswer(ctx, 0, 0, receivedAt, receivedAt)).toEqual({
      kind: "rejected",
    });
  });

  it("does not accept answers on an attempt older than the maximum age", () => {
    const ctx = makeContext();
    const receivedAt = START + ATTEMPT_MAX_AGE_MS + 1;
    expect(decideAnswer(ctx, 0, 0, receivedAt, receivedAt)).toEqual({
      kind: "rejected",
    });
  });

  it("ends the attempt with no next question when the mistake limit is reached", () => {
    let ctx = makeContext();
    ctx = answer(ctx, 400, false);
    ctx = answer(ctx, 400, false);
    const { state } = ctx;
    const receivedAt = state.resumedAt + 400;
    const decision = decideAnswer(
      ctx,
      state.sequence,
      99,
      receivedAt,
      receivedAt,
    );

    expect(decision.kind).toBe("accepted");
    if (decision.kind !== "accepted") return;
    expect(decision.state.incorrectAnswers).toBe(MISTAKE_LIMIT);
    expect(decision.response).toMatchObject({ next: null });
  });

  it("does not accept answers once the mistake limit is reached", () => {
    let ctx = makeContext();
    for (let i = 0; i < MISTAKE_LIMIT; i++) ctx = answer(ctx, 400, false);
    const { state } = ctx;
    const receivedAt = state.resumedAt + 400;
    expect(
      decideAnswer(
        ctx,
        state.sequence,
        ctx.questions[state.sequence],
        receivedAt,
        receivedAt,
      ),
    ).toEqual({ kind: "rejected" });
  });

  it("ends the attempt with no next question when the last question is answered", () => {
    let ctx = makeContext({ questions: [3, 4] });
    ctx = answer(ctx, 400);
    const { state } = ctx;
    const receivedAt = state.resumedAt + 400;
    const decision = decideAnswer(ctx, 1, 4, receivedAt, receivedAt);

    expect(decision.kind).toBe("accepted");
    if (decision.kind !== "accepted") return;
    expect(decision.response).toMatchObject({ next: null });
  });

  it("does not accept answers past the end of the question list", () => {
    let ctx = makeContext({ questions: [3] });
    ctx = answer(ctx, 400);
    const receivedAt = ctx.state.resumedAt + 400;
    expect(decideAnswer(ctx, 1, 0, receivedAt, receivedAt)).toEqual({
      kind: "rejected",
    });
  });

  describe("resending the previous answer", () => {
    it("returns the same response for the same answer instead of grading it twice", () => {
      const ctx = makeContext();
      const receivedAt = FIRST_RESUME + 700;
      const first = decideAnswer(ctx, 0, 0, receivedAt, receivedAt);
      if (first.kind !== "accepted") throw new Error("not accepted");

      const after = { ...ctx, state: first.state };
      const resentAt = receivedAt + 900;
      const replay = decideAnswer(after, 0, 0, resentAt, resentAt);

      expect(replay).toEqual({ kind: "replay", response: first.response });
    });

    it("rejects a different answer to the already answered question", () => {
      const ctx = answer(makeContext(), 700, false);
      const resentAt = ctx.state.resumedAt;
      expect(decideAnswer(ctx, 0, 0, resentAt, resentAt)).toEqual({
        kind: "rejected",
      });
    });

    it("still returns the same response after the attempt was finished", () => {
      const ctx = makeContext();
      const receivedAt = FIRST_RESUME + 700;
      const first = decideAnswer(ctx, 0, 0, receivedAt, receivedAt);
      if (first.kind !== "accepted") throw new Error("not accepted");

      const finished = { ...ctx, state: first.state, consumed: true };
      const resentAt = START + ATTEMPT_MAX_AGE_MS + 1;
      expect(decideAnswer(finished, 0, 0, resentAt, resentAt)).toEqual({
        kind: "replay",
        response: first.response,
      });
    });

    it("returns no next question when the resent answer had ended the attempt", () => {
      let ctx = makeContext();
      for (let i = 0; i < MISTAKE_LIMIT; i++) ctx = answer(ctx, 400, false);
      const last = ctx.state.answers.at(-1);
      const resentAt = ctx.state.resumedAt;
      expect(
        decideAnswer(ctx, MISTAKE_LIMIT - 1, last?.answer, resentAt, resentAt),
      ).toEqual({
        kind: "replay",
        response: {
          status: "accepted",
          correct: false,
          elapsedMs: 1200,
          next: null,
        },
      });
    });

    it("matches the stored answer regardless of key order and undefined keys, as jsonb stores it", () => {
      type Move = { from: string; to: string; promotion?: string };
      const moveDefinition: ChallengeModuleDefinition<
        Record<string, never>,
        Move,
        Move
      > = {
        ...fakeDefinition,
        generateQuestions: () => [],
        parseAnswer: (raw) =>
          typeof raw === "object" && raw !== null ? (raw as Move) : null,
        grade: (q, a) => q.from === a.from && q.to === a.to,
      };
      const questions: Move[] = [
        { from: "e2", to: "e4" },
        { from: "d2", to: "d4" },
      ];
      const ctx: ChallengeAttemptContext<Record<string, never>, Move, Move> = {
        definition: moveDefinition,
        settings: {},
        questions,
        state: startedAttemptState(START),
        consumed: false,
        startedAt: START,
        timeLimitMs: LIMIT_MS,
        mistakeLimit: MISTAKE_LIMIT,
      };
      const receivedAt = FIRST_RESUME + 700;
      const first = decideAnswer(
        ctx,
        0,
        { from: "e2", to: "e4", promotion: undefined },
        receivedAt,
        receivedAt,
      );
      if (first.kind !== "accepted") throw new Error("not accepted");

      // What the row holds after a round trip through jsonb.
      const stored: ChallengeAttemptState = {
        ...first.state,
        answers: first.state.answers.map((record) => ({
          ...record,
          answer: { to: "e4", from: "e2" },
        })),
      };
      const resentAt = receivedAt + 900;
      expect(
        decideAnswer(
          { ...ctx, state: stored },
          0,
          { from: "e2", to: "e4" },
          resentAt,
          resentAt,
        ),
      ).toEqual({ kind: "replay", response: first.response });
    });
  });
});

describe("decideFinish", () => {
  /** A context whose time limit has run out after `count` answers of `thinkMs`. */
  function timedOut(count: number, thinkMs: number) {
    const ctx = answerMany(makeContext(), count, thinkMs);
    const now = ctx.state.resumedAt + (LIMIT_MS - ctx.state.elapsedMs);
    return { ctx, now };
  }

  it("returns the remaining time when asked to finish before the time limit", () => {
    const ctx = answer(makeContext(), 1000);
    const now = ctx.state.resumedAt + 2000;
    expect(decideFinish(ctx, now)).toEqual({
      kind: "pending",
      remainingMs: LIMIT_MS - 3000,
    });
  });

  it("does not count the feedback flash toward the remaining time", () => {
    const ctx = answer(makeContext(), 1000);
    expect(decideFinish(ctx, ctx.state.resumedAt - 1)).toEqual({
      kind: "pending",
      remainingMs: LIMIT_MS - 1000,
    });
  });

  it("records the full time limit as the time taken when time runs out", () => {
    const { ctx, now } = timedOut(10, 1000);
    expect(decideFinish(ctx, now)).toEqual({
      kind: "recorded",
      score: 10,
      incorrectAnswers: 0,
      timeTaken: 60,
    });
  });

  it("finishes before the time limit once the mistake limit is reached, recording the thinking time", () => {
    let ctx = answerMany(makeContext(), 4, 1000);
    for (let i = 0; i < MISTAKE_LIMIT; i++) ctx = answer(ctx, 1500, false);
    expect(decideFinish(ctx, ctx.state.resumedAt)).toEqual({
      kind: "recorded",
      score: 4,
      incorrectAnswers: MISTAKE_LIMIT,
      timeTaken: 8,
    });
  });

  it("finishes before the time limit once every question is answered, recording the full time limit", () => {
    const ctx = answerMany(
      makeContext({ questions: [0, 1, 2, 3, 4, 5] }),
      6,
      1000,
    );
    expect(decideFinish(ctx, ctx.state.resumedAt)).toEqual({
      kind: "recorded",
      score: 6,
      incorrectAnswers: 0,
      timeTaken: 60,
    });
  });

  it("consumes but does not record an attempt with no answers", () => {
    const ctx = makeContext();
    expect(decideFinish(ctx, FIRST_RESUME + LIMIT_MS)).toEqual({
      kind: "unrecorded",
    });
  });

  it("refuses to record a run whose mean thinking time is below the module's floor", () => {
    const { ctx, now } = timedOut(
      MIN_ANSWERS_FOR_SPEED_CHECK,
      MIN_MEAN_THINK_MS - 1,
    );
    expect(decideFinish(ctx, now)).toEqual({
      kind: "refused",
      reason: "implausible_speed",
    });
  });

  it("records a run whose mean thinking time is exactly the module's floor", () => {
    const { ctx, now } = timedOut(
      MIN_ANSWERS_FOR_SPEED_CHECK,
      MIN_MEAN_THINK_MS,
    );
    expect(decideFinish(ctx, now).kind).toBe("recorded");
  });

  it("does not apply the speed check to a run with fewer answers than the threshold", () => {
    const { ctx, now } = timedOut(MIN_ANSWERS_FOR_SPEED_CHECK - 1, 0);
    expect(decideFinish(ctx, now).kind).toBe("recorded");
  });

  it("rejects finishing an attempt older than the maximum age", () => {
    const { ctx } = timedOut(10, 1000);
    expect(decideFinish(ctx, START + ATTEMPT_MAX_AGE_MS + 1)).toEqual({
      kind: "rejected",
    });
  });

  it("does not decide a finished attempt a second time", () => {
    const { ctx, now } = timedOut(10, 1000);
    expect(decideFinish({ ...ctx, consumed: true }, now)).toEqual({
      kind: "rejected",
    });
  });
});
