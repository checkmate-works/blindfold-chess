import {
  CHALLENGE_RULES_VERSION,
  COUNTDOWN_TOTAL_MS,
  START_GRACE_MS,
  startedAttemptState,
} from '@blindfold-chess/features/challenge-attempt';
import type { ChallengeAttemptState } from '@blindfold-chess/features/challenge-attempt';
import { CHALLENGE_MODULES } from '@blindfold-chess/features/challenge-attempt/modules';
import { getSquareColor } from '@blindfold-chess/features/square-colors';
import type { Square } from '@blindfold-chess/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { answerChallengeAttempt, beginChallengeAttempt, finishChallengeAttempt } from './attempts';

// ---------------------------------------------------------------------------
// An in-memory `challenge_attempts` table behind a Drizzle-shaped double.
//
// `eq` / `and` are replaced with inspectable markers so the double can apply
// the WHERE clause the code under test built — which is what makes "another
// player's attempt id finds nothing" a real assertion rather than a stub
// returning no rows. jsonb columns go through a JSON round trip on write, as
// they do in Postgres, so the rules see the stored shapes, not the objects
// the code happened to keep in memory.
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => {
  type Cond = { __eq: [{ name: string }, unknown] } | { __and: Cond[] };
  type Row = Record<string, unknown>;

  const COLUMN_KEYS: Record<string, string> = { id: 'id', user_id: 'userId' };
  const JSON_COLUMNS = ['settings', 'questions', 'state'];

  const rows = new Map<string, Row>();
  const lockModes: string[] = [];
  const updates: Row[] = [];
  let nextId = 1;

  const matches = (row: Row, cond: Cond): boolean =>
    '__and' in cond
      ? cond.__and.every((c) => matches(row, c))
      : row[COLUMN_KEYS[cond.__eq[0].name]] === cond.__eq[1];

  const stored = (values: Row): Row =>
    Object.fromEntries(
      Object.entries(values).map(([k, v]) => [
        k,
        JSON_COLUMNS.includes(k) ? JSON.parse(JSON.stringify(v)) : v,
      ])
    );

  const ops = {
    insert: () => ({
      values: (values: Row) => ({
        returning: () => {
          const id = `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;
          rows.set(id, {
            id,
            consumedAt: null,
            outcome: null,
            challengeResultId: null,
            ...stored(values),
          });
          return [{ id }];
        },
      }),
    }),
    select: () => ({
      from: () => ({
        where: (cond: Cond) => ({
          for: (mode: string) => {
            lockModes.push(mode);
            return [...rows.values()]
              .filter((r) => matches(r, cond))
              .map((r) => structuredClone(r));
          },
        }),
      }),
    }),
    update: () => ({
      set: (patch: Row) => ({
        where: (cond: Cond) => {
          updates.push(patch);
          for (const row of rows.values()) {
            if (matches(row, cond)) Object.assign(row, stored(patch));
          }
        },
      }),
    }),
  };

  const db = {
    ...ops,
    transaction: async <T>(fn: (tx: typeof ops) => Promise<T>) => fn(ops),
  };

  const reset = () => {
    rows.clear();
    lockModes.length = 0;
    updates.length = 0;
    nextId = 1;
  };

  return { rows, lockModes, updates, db, reset };
});

vi.mock('drizzle-orm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('drizzle-orm')>()),
  eq: (column: unknown, value: unknown) => ({ __eq: [column, value] }),
  and: (...conds: unknown[]) => ({ __and: conds }),
}));

vi.mock('@/lib/db', () => ({ db: h.db }));

const mockWriteChallengeResult = vi.fn();
const mockEvaluateRanksAfterChallenge = vi.fn();
vi.mock('@/lib/db/save-challenge-result', () => ({
  writeChallengeResult: (...args: unknown[]) => mockWriteChallengeResult(...args),
  evaluateRanksAfterChallenge: (...args: unknown[]) => mockEvaluateRanksAfterChallenge(...args),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const RESULT_ID = '33333333-3333-4333-8333-333333333333';
const GRANTED = [{ slug: '5kyu', level: 10, color: 'orange' }];

const T0 = 1_800_000_000_000;
/** When the first question's clock starts. */
const FIRST_RESUME = T0 + COUNTDOWN_TOTAL_MS + START_GRACE_MS;
/** square_colors' feedback flash. */
const FEEDBACK_MS = 500;

let now = T0;
const clock = () => now;

function storedRow(attemptId: string) {
  const row = h.rows.get(attemptId);
  if (!row) throw new Error(`no row ${attemptId}`);
  return row as {
    questions: Square[];
    state: ChallengeAttemptState;
    consumedAt: Date | null;
    outcome: string | null;
    challengeResultId: string | null;
    rulesVersion: number;
  };
}

async function beginSquareColors() {
  const result = await beginChallengeAttempt({
    userId: USER_ID,
    menuType: 'square_colors',
    rawSettings: {},
    clock,
  });
  if (!result.ok) throw new Error('begin failed');
  return result.attemptId;
}

function rightAnswer(attemptId: string, sequence: number): string {
  const color = getSquareColor(storedRow(attemptId).questions[sequence]);
  if (color === null) throw new Error(`no colour for question ${sequence}`);
  return color;
}

function wrongAnswer(attemptId: string, sequence: number) {
  return rightAnswer(attemptId, sequence) === 'light' ? 'dark' : 'light';
}

/**
 * Answers the current question after `thinkMs` of thinking time, measured
 * from when the server resumed its clock; processing takes 10 ms.
 */
async function answerAfter(
  attemptId: string,
  thinkMs: number,
  answer: (attemptId: string, sequence: number) => string = rightAnswer
) {
  const { sequence, resumedAt } = storedRow(attemptId).state;
  const receivedAt = resumedAt + thinkMs;
  now = receivedAt + 10;
  return answerChallengeAttempt({
    userId: USER_ID,
    attemptId,
    sequence,
    rawAnswer: answer(attemptId, sequence),
    receivedAt,
    clock,
  });
}

beforeEach(() => {
  h.reset();
  now = T0;
  mockWriteChallengeResult.mockResolvedValue({ exp: {}, challengeResultId: RESULT_ID });
  mockEvaluateRanksAfterChallenge.mockResolvedValue(GRANTED);
});

// ---------------------------------------------------------------------------
// beginChallengeAttempt
// ---------------------------------------------------------------------------

describe('beginChallengeAttempt', () => {
  it('stores every question up front with the start state, rules version and server start time', async () => {
    const attemptId = await beginSquareColors();
    const row = h.rows.get(attemptId);

    expect(row).toMatchObject({
      userId: USER_ID,
      menuType: 'square_colors',
      leaderboardKey: 'default',
      rulesVersion: CHALLENGE_RULES_VERSION,
      settings: {},
      state: startedAttemptState(T0),
      startedAt: new Date(T0),
      consumedAt: null,
    });
    expect(storedRow(attemptId).questions).toHaveLength(
      CHALLENGE_MODULES.square_colors.maxQuestions
    );
  });

  it('returns only the first question to the client', async () => {
    const result = await beginChallengeAttempt({
      userId: USER_ID,
      menuType: 'square_colors',
      rawSettings: {},
      clock,
    });

    if (!result.ok) throw new Error('begin failed');
    expect(result.first).toEqual({
      sequence: 0,
      question: storedRow(result.attemptId).questions[0],
    });
  });

  it('derives the leaderboard key from the validated settings', async () => {
    const result = await beginChallengeAttempt({
      userId: USER_ID,
      menuType: 'coordinate_quiz',
      rawSettings: { boardOrientation: 'black' },
      clock,
    });

    if (!result.ok) throw new Error('begin failed');
    expect(h.rows.get(result.attemptId)).toMatchObject({ leaderboardKey: 'black' });
  });

  it('refuses settings outside the module allowed values, so no free-form leaderboard key is created', async () => {
    const result = await beginChallengeAttempt({
      userId: USER_ID,
      menuType: 'coordinate_quiz',
      rawSettings: { boardOrientation: 'my-own-board' },
      clock,
    });

    expect(result).toEqual({ ok: false, error: 'invalid_settings' });
    expect(h.rows.size).toBe(0);
  });

  it.each([['quadrants'], ['toString'], [42]])('refuses %s as a menu type', async (menuType) => {
    const result = await beginChallengeAttempt({
      userId: USER_ID,
      menuType,
      rawSettings: {},
      clock,
    });

    expect(result).toEqual({ ok: false, error: 'invalid_menu_type' });
    expect(h.rows.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// answerChallengeAttempt
// ---------------------------------------------------------------------------

describe('answerChallengeAttempt', () => {
  it('grades the answer against the stored question and returns the next one', async () => {
    const attemptId = await beginSquareColors();

    const response = await answerAfter(attemptId, 1000);

    expect(response).toEqual({
      status: 'accepted',
      correct: true,
      elapsedMs: 1000,
      next: { sequence: 1, question: storedRow(attemptId).questions[1] },
    });
    expect(storedRow(attemptId).state).toMatchObject({
      sequence: 1,
      score: 1,
      incorrectAnswers: 0,
      elapsedMs: 1000,
    });
  });

  it('reads the row under a FOR UPDATE lock and writes only the state', async () => {
    const attemptId = await beginSquareColors();
    const questionsBefore = storedRow(attemptId).questions;

    await answerAfter(attemptId, 1000);

    expect(h.lockModes).toEqual(['update']);
    expect(h.updates).toHaveLength(1);
    expect(Object.keys(h.updates[0])).toEqual(['state']);
    expect(storedRow(attemptId).questions).toEqual(questionsBefore);
  });

  it('resumes the clock no earlier than when the server finished processing the answer', async () => {
    const attemptId = await beginSquareColors();
    const receivedAt = FIRST_RESUME + 1000;
    // Processing (auth, lock wait) took longer than the feedback flash.
    now = receivedAt + FEEDBACK_MS + 200;

    await answerChallengeAttempt({
      userId: USER_ID,
      attemptId,
      sequence: 0,
      rawAnswer: rightAnswer(attemptId, 0),
      receivedAt,
      clock,
    });

    expect(storedRow(attemptId).state.resumedAt).toBe(now);
  });

  it('answers a resend of the previous answer with the same response without grading it again', async () => {
    const attemptId = await beginSquareColors();
    const first = await answerAfter(attemptId, 1000);

    now += 2000;
    const resend = await answerChallengeAttempt({
      userId: USER_ID,
      attemptId,
      sequence: 0,
      rawAnswer: rightAnswer(attemptId, 0),
      receivedAt: now,
      clock,
    });

    expect(resend).toEqual(first);
    expect(storedRow(attemptId).state).toMatchObject({ sequence: 1, score: 1 });
    expect(h.updates).toHaveLength(1);
  });

  it('rejects a different answer for an already-answered question', async () => {
    const attemptId = await beginSquareColors();
    await answerAfter(attemptId, 1000, wrongAnswer);

    now += 2000;
    const swapped = await answerChallengeAttempt({
      userId: USER_ID,
      attemptId,
      sequence: 0,
      rawAnswer: rightAnswer(attemptId, 0),
      receivedAt: now,
      clock,
    });

    expect(swapped).toEqual({ status: 'rejected' });
    expect(storedRow(attemptId).state).toMatchObject({ score: 0, incorrectAnswers: 1 });
  });

  it("rejects an answer to another player's attempt", async () => {
    const attemptId = await beginSquareColors();
    now = FIRST_RESUME + 1000;

    const response = await answerChallengeAttempt({
      userId: OTHER_USER_ID,
      attemptId,
      sequence: 0,
      rawAnswer: rightAnswer(attemptId, 0),
      receivedAt: now,
      clock,
    });

    expect(response).toEqual({ status: 'rejected' });
    expect(storedRow(attemptId).state.sequence).toBe(0);
  });

  it('rejects an attempt id that is not a UUID without touching the table', async () => {
    const response = await answerChallengeAttempt({
      userId: USER_ID,
      attemptId: "'; DROP TABLE challenge_attempts; --",
      sequence: 0,
      rawAnswer: 'light',
      receivedAt: now,
      clock,
    });

    expect(response).toEqual({ status: 'rejected' });
    expect(h.lockModes).toEqual([]);
  });

  it('rejects an oversized answer before locking the row', async () => {
    const attemptId = await beginSquareColors();
    now = FIRST_RESUME + 1000;

    const response = await answerChallengeAttempt({
      userId: USER_ID,
      attemptId,
      sequence: 0,
      rawAnswer: { path: Array.from({ length: 2000 }, () => 'a1') },
      receivedAt: now,
      clock,
    });

    expect(response).toEqual({ status: 'rejected' });
    expect(h.lockModes).toEqual([]);
  });

  it('reports an answer that arrives after the time limit as expired without counting it', async () => {
    const attemptId = await beginSquareColors();

    const response = await answerAfter(attemptId, 61_000);

    expect(response).toEqual({ status: 'expired' });
    expect(storedRow(attemptId).state.sequence).toBe(0);
    expect(h.updates).toHaveLength(0);
  });

  it('rejects answers to a row played under another rules version', async () => {
    const attemptId = await beginSquareColors();
    h.rows.get(attemptId)!.rulesVersion = CHALLENGE_RULES_VERSION + 1;

    const response = await answerAfter(attemptId, 1000);

    expect(response).toEqual({ status: 'rejected' });
    expect(h.updates).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// finishChallengeAttempt
// ---------------------------------------------------------------------------

describe('finishChallengeAttempt', () => {
  async function finish(userId = USER_ID, attemptId: string) {
    return finishChallengeAttempt({ userId, attemptId, clock });
  }

  async function playToMistakeLimit(attemptId: string) {
    await answerAfter(attemptId, 1000);
    await answerAfter(attemptId, 1000, wrongAnswer);
    await answerAfter(attemptId, 1000, wrongAnswer);
    await answerAfter(attemptId, 1000, wrongAnswer);
  }

  it('answers pending with the time left while the attempt is still running, leaving the row as is', async () => {
    const attemptId = await beginSquareColors();
    await answerAfter(attemptId, 1000);
    const updatesBefore = h.updates.length;
    now = storedRow(attemptId).state.resumedAt + 4000;

    const result = await finish(USER_ID, attemptId);

    expect(result).toEqual({ status: 'pending', remainingMs: 55_000 });
    expect(h.updates).toHaveLength(updatesBefore);
    expect(storedRow(attemptId).consumedAt).toBeNull();
  });

  it('records the score the row accumulated, consumes the row in the same transaction, then evaluates ranks', async () => {
    const attemptId = await beginSquareColors();
    await playToMistakeLimit(attemptId);
    now += 1000;

    const result = await finish(USER_ID, attemptId);

    expect(result).toEqual({
      status: 'recorded',
      challengeResultId: RESULT_ID,
      grantedRanks: GRANTED,
    });
    expect(mockWriteChallengeResult).toHaveBeenCalledWith(expect.anything(), {
      userId: USER_ID,
      menuType: 'square_colors',
      leaderboardKey: 'default',
      score: 1,
      incorrectAnswers: 3,
      timeTaken: 4,
    });
    expect(storedRow(attemptId)).toMatchObject({
      consumedAt: new Date(now),
      outcome: 'recorded',
      challengeResultId: RESULT_ID,
    });
    expect(mockEvaluateRanksAfterChallenge).toHaveBeenCalledWith(USER_ID);
    expect(mockEvaluateRanksAfterChallenge.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockWriteChallengeResult.mock.invocationCallOrder[0]
    );
  });

  it('answers a resent finish with the stored result instead of recording twice', async () => {
    const attemptId = await beginSquareColors();
    await playToMistakeLimit(attemptId);
    await finish(USER_ID, attemptId);

    now += 5000;
    const resent = await finish(USER_ID, attemptId);

    expect(resent).toEqual({ status: 'recorded', challengeResultId: RESULT_ID, grantedRanks: [] });
    expect(mockWriteChallengeResult).toHaveBeenCalledTimes(1);
    expect(mockEvaluateRanksAfterChallenge).toHaveBeenCalledTimes(1);
  });

  it('answers a resent finish as rejected once the recorded result has been deleted', async () => {
    const attemptId = await beginSquareColors();
    await playToMistakeLimit(attemptId);
    await finish(USER_ID, attemptId);
    // What the ON DELETE SET NULL foreign key leaves behind when the result row goes.
    h.rows.set(attemptId, { ...h.rows.get(attemptId)!, challengeResultId: null });

    now += 5000;
    const resent = await finish(USER_ID, attemptId);

    expect(resent).toEqual({ status: 'rejected' });
    expect(mockWriteChallengeResult).toHaveBeenCalledTimes(1);
  });

  it('still answers a resent answer on a consumed row with its original response', async () => {
    const attemptId = await beginSquareColors();
    await playToMistakeLimit(attemptId);
    const lastSequence = storedRow(attemptId).state.sequence - 1;
    await finish(USER_ID, attemptId);

    const resend = await answerChallengeAttempt({
      userId: USER_ID,
      attemptId,
      sequence: lastSequence,
      rawAnswer: wrongAnswer(attemptId, lastSequence),
      receivedAt: now,
      clock,
    });

    expect(resend).toMatchObject({ status: 'accepted', correct: false, next: null });
  });

  it('consumes a run with no answers as unrecorded and writes no result', async () => {
    const attemptId = await beginSquareColors();
    now = FIRST_RESUME + 60_000;

    const result = await finish(USER_ID, attemptId);
    const resent = await finish(USER_ID, attemptId);

    expect(result).toEqual({ status: 'unrecorded' });
    expect(resent).toEqual({ status: 'unrecorded' });
    expect(storedRow(attemptId)).toMatchObject({
      consumedAt: new Date(now),
      outcome: 'unrecorded',
      challengeResultId: null,
    });
    expect(mockWriteChallengeResult).not.toHaveBeenCalled();
    expect(mockEvaluateRanksAfterChallenge).not.toHaveBeenCalled();
  });

  it('consumes a run whose mean thinking time is below the module floor as refused and writes no result', async () => {
    const attemptId = await beginSquareColors();
    for (let i = 0; i < 5; i++) await answerAfter(attemptId, 100);
    now = storedRow(attemptId).state.resumedAt + 60_000;

    const result = await finish(USER_ID, attemptId);
    const resent = await finish(USER_ID, attemptId);

    expect(result).toEqual({ status: 'refused', reason: 'implausible_speed' });
    expect(resent).toEqual({ status: 'refused', reason: 'implausible_speed' });
    expect(storedRow(attemptId)).toMatchObject({ outcome: 'implausible_speed' });
    expect(mockWriteChallengeResult).not.toHaveBeenCalled();
  });

  it("rejects finishing another player's attempt and leaves it unconsumed", async () => {
    const attemptId = await beginSquareColors();
    await playToMistakeLimit(attemptId);

    const result = await finish(OTHER_USER_ID, attemptId);

    expect(result).toEqual({ status: 'rejected' });
    expect(storedRow(attemptId).consumedAt).toBeNull();
    expect(mockWriteChallengeResult).not.toHaveBeenCalled();
  });

  it('rejects finishing a row older than the attempt lifetime and leaves it unconsumed', async () => {
    const attemptId = await beginSquareColors();
    await playToMistakeLimit(attemptId);
    now = T0 + 600_001;

    const result = await finish(USER_ID, attemptId);

    expect(result).toEqual({ status: 'rejected' });
    expect(storedRow(attemptId).consumedAt).toBeNull();
  });

  it('leaves the row unconsumed and skips rank evaluation when writing the result fails', async () => {
    const attemptId = await beginSquareColors();
    await playToMistakeLimit(attemptId);
    mockWriteChallengeResult.mockRejectedValueOnce(new Error('db down'));

    await expect(finish(USER_ID, attemptId)).rejects.toThrow('db down');

    expect(storedRow(attemptId).consumedAt).toBeNull();
    expect(mockEvaluateRanksAfterChallenge).not.toHaveBeenCalled();
  });

  it('reads the row under a FOR UPDATE lock', async () => {
    const attemptId = await beginSquareColors();
    now = FIRST_RESUME + 60_000;

    await finish(USER_ID, attemptId);

    expect(h.lockModes).toEqual(['update']);
  });
});
