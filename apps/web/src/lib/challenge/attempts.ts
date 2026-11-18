/**
 * Server-run challenge attempts: start, answer, finish.
 *
 * A signed-in player's challenge is played against a `challenge_attempts`
 * row. Starting generates every question on the server and stores them on
 * the row; each answer is graded as it arrives, against the stored question
 * and the server's own clock, and the response carries the next question
 * only; finishing takes nothing but the attempt id and records the score,
 * mistakes and time the row accumulated. Nothing the client says about its
 * score or its timings is believed, because nothing it says about them is
 * read.
 *
 * The alternative that was rejected — the client sending its whole answer
 * log at the end, with a seed the server replays — leaves every timestamp in
 * the log as the client's claim: a log rebuilt after the fact cannot be told
 * apart from one played under a manipulated clock. And handing the client the
 * seed lets it compute every question before the first one is shown.
 *
 * ## One consumption, decided under a row lock
 *
 * Answering and finishing both read the row with `SELECT … FOR UPDATE` and
 * decide inside the same transaction. Concurrent and resent requests for one
 * attempt are therefore serialised, so the pure rules in
 * `@blindfold-chess/features/challenge-attempt` always judge the latest
 * state: a resend of the previous answer (its response was lost in transit)
 * gets the same response again instead of being graded twice, a different
 * answer for an already-answered question is rejected (no swapping an answer
 * after seeing whether it was right), and a row is consumed exactly once —
 * the result is written in the transaction that sets `consumed_at`, and every
 * later finish request gets the outcome stored on the row back instead of a
 * second decision or a second record.
 *
 * ## Whose clock
 *
 * Every time here is the application's clock (`Date.now()`, replaceable via
 * `clock` in tests), never the database's `now()`: the transition rules
 * compare times stored on the row with the time of the current request, and
 * mixing two clocks would turn their skew into thinking time.
 */
import {
  CHALLENGE_RULES_VERSION,
  type ChallengeAnswerResponse,
  type ChallengeAttemptContext,
  decideAnswer,
  decideFinish,
  startedAttemptState,
} from '@blindfold-chess/features/challenge-attempt';
import {
  type ErasedChallengeModuleDefinition,
  getChallengeModule,
} from '@blindfold-chess/features/challenge-attempt/modules';
import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@blindfold-chess/features/practice-registry';
import { and, eq } from 'drizzle-orm';
import 'server-only';

import { db } from '@/lib/db';
import type { GrantedRank } from '@/lib/db/data/ranks';
import { evaluateRanksAfterChallenge, writeChallengeResult } from '@/lib/db/save-challenge-result';
import { type ChallengeAttempt, challengeAttempts } from '@/lib/db/schema';
import type { DbTx } from '@/lib/db/types';
import { UUID_RE } from '@/lib/validations/uuid';

type Clock = () => number;

/**
 * The largest answer, as JSON, that is graded at all.
 *
 * Every module's answer is a few bytes (a square, a colour, a boolean) except
 * the route planner's path, which has no length limit of its own. An honest
 * path on an 8×8 board is a few hundred bytes; anything far beyond that is
 * rejected before the row is locked, so an oversized payload neither costs a
 * grading pass nor lands in the stored answer log.
 */
const MAX_ANSWER_JSON_LENGTH = 4096;

/** What `outcome` holds once a row is consumed. */
export type ChallengeAttemptOutcome = 'recorded' | 'unrecorded' | 'implausible_speed';

export type BeginChallengeAttemptResult =
  | { ok: true; attemptId: string; first: { sequence: number; question: unknown } }
  | { ok: false; error: 'invalid_menu_type' | 'invalid_settings' };

export type FinishChallengeAttemptResult =
  | { status: 'pending'; remainingMs: number }
  | { status: 'rejected' }
  | { status: 'unrecorded' }
  | { status: 'refused'; reason: 'implausible_speed' }
  | {
      status: 'recorded';
      challengeResultId: string;
      /** Ranks granted by this finish; empty on a resent finish of a recorded row. */
      grantedRanks: GrantedRank[];
    };

/**
 * Starts a challenge: validates the settings against the module's allowed
 * values, derives the leaderboard key from them, generates the whole question
 * list and stores it on a new row.
 *
 * The leaderboard key comes from the module definition, never from the
 * client: a free-form key would let anyone create a ranking of their own.
 */
export async function beginChallengeAttempt({
  userId,
  menuType,
  rawSettings,
  clock = Date.now,
}: {
  userId: string;
  menuType: unknown;
  rawSettings: unknown;
  clock?: Clock;
}): Promise<BeginChallengeAttemptResult> {
  if (typeof menuType !== 'string') return { ok: false, error: 'invalid_menu_type' };
  const definition = getChallengeModule(menuType);
  if (!definition) return { ok: false, error: 'invalid_menu_type' };

  const settings = definition.parseSettings(rawSettings);
  if (settings === null) return { ok: false, error: 'invalid_settings' };

  const questions = definition.generateQuestions(settings, definition.maxQuestions);
  if (questions.length === 0) {
    throw new Error(`beginChallengeAttempt: ${menuType} generated no questions`);
  }

  const now = clock();
  const [row] = await db
    .insert(challengeAttempts)
    .values({
      userId,
      menuType,
      leaderboardKey: definition.leaderboardKey(settings),
      rulesVersion: CHALLENGE_RULES_VERSION,
      settings,
      questions,
      state: startedAttemptState(now),
      startedAt: new Date(now),
    })
    .returning({ id: challengeAttempts.id });

  return { ok: true, attemptId: row.id, first: { sequence: 0, question: questions[0] } };
}

/**
 * Grades one answer against the player's own row, under its row lock.
 *
 * `receivedAt` is when the request reached the server, taken before
 * authentication and the lock; the time spent on those is not thinking time.
 * The next question's clock may not resume before `respondedAt`, which is
 * read from the clock right before grading, after the lock was acquired.
 *
 * Only an accepted answer writes, and it writes `state` only — the questions
 * stored at start are never changed.
 */
export async function answerChallengeAttempt({
  userId,
  attemptId,
  sequence,
  rawAnswer,
  receivedAt,
  clock = Date.now,
}: {
  userId: string;
  attemptId: unknown;
  sequence: unknown;
  rawAnswer: unknown;
  receivedAt: number;
  clock?: Clock;
}): Promise<ChallengeAnswerResponse<unknown>> {
  if (!isAttemptId(attemptId) || !isAnswerSmallEnough(rawAnswer)) return { status: 'rejected' };

  return db.transaction(async (tx) => {
    const row = await lockOwnAttempt(tx, userId, attemptId);
    const ctx = row && attemptContext(row);
    if (!row || !ctx) return { status: 'rejected' } as const;

    const decision = decideAnswer(ctx, sequence, rawAnswer, receivedAt, clock());
    switch (decision.kind) {
      case 'replay':
        return decision.response;
      case 'rejected':
        return { status: 'rejected' } as const;
      case 'expired':
        return { status: 'expired' } as const;
      case 'accepted':
        await tx
          .update(challengeAttempts)
          .set({ state: decision.state })
          .where(eq(challengeAttempts.id, row.id));
        return decision.response;
      default: {
        const exhaustive: never = decision;
        return exhaustive;
      }
    }
  });
}

/**
 * Finishes the player's own attempt, under its row lock.
 *
 * A consumed row answers with the outcome stored when it was consumed, so a
 * finish whose response was lost can be retried without deciding or
 * recording twice. Otherwise the rules decide: `pending` and `rejected` leave
 * the row as it is (the client asks again once its clock runs out);
 * `unrecorded` and `refused` consume the row without a result; `recorded`
 * writes the result in the same transaction that consumes the row, and belt
 * ranks are evaluated after that transaction has committed.
 */
export async function finishChallengeAttempt({
  userId,
  attemptId,
  clock = Date.now,
}: {
  userId: string;
  attemptId: unknown;
  clock?: Clock;
}): Promise<FinishChallengeAttemptResult> {
  if (!isAttemptId(attemptId)) return { status: 'rejected' };

  const result = await db.transaction(async (tx): Promise<FinishTransactionResult> => {
    const row = await lockOwnAttempt(tx, userId, attemptId);
    if (!row) return notRecordedNow({ status: 'rejected' });
    if (row.consumedAt !== null) return notRecordedNow(storedOutcome(row));

    const ctx = attemptContext(row);
    if (!ctx) return notRecordedNow({ status: 'rejected' });

    const now = clock();
    const decision = decideFinish(ctx, now);
    switch (decision.kind) {
      case 'pending':
        return notRecordedNow({ status: 'pending', remainingMs: decision.remainingMs });
      case 'rejected':
        return notRecordedNow({ status: 'rejected' });
      case 'unrecorded':
        await consume(tx, row.id, now, 'unrecorded', null);
        return notRecordedNow({ status: 'unrecorded' });
      case 'refused':
        await consume(tx, row.id, now, decision.reason, null);
        return notRecordedNow({ status: 'refused', reason: decision.reason });
      case 'recorded': {
        const { challengeResultId } = await writeChallengeResult(tx, {
          userId,
          menuType: row.menuType,
          leaderboardKey: row.leaderboardKey,
          score: decision.score,
          incorrectAnswers: decision.incorrectAnswers,
          timeTaken: decision.timeTaken,
        });
        await consume(tx, row.id, now, 'recorded', challengeResultId);
        return {
          response: { status: 'recorded', challengeResultId, grantedRanks: [] },
          recordedNow: true,
        };
      }
      default: {
        const exhaustive: never = decision;
        return exhaustive;
      }
    }
  });

  if (!result.recordedNow) return result.response;
  // After the commit, so the evaluation reads the new best score. A resent
  // finish of a recorded row skips this: its ranks were evaluated the first
  // time and are already granted.
  return { ...result.response, grantedRanks: await evaluateRanksAfterChallenge(userId) };
}

/** What the finish transaction hands out of the lock: the response, and whether it recorded a result just now. */
type FinishTransactionResult =
  | { response: FinishChallengeAttemptResult; recordedNow: false }
  | {
      response: Extract<FinishChallengeAttemptResult, { status: 'recorded' }>;
      recordedNow: true;
    };

function notRecordedNow(response: FinishChallengeAttemptResult): FinishTransactionResult {
  return { response, recordedNow: false };
}

/** Locks the player's own row; another player's id is treated as not found. */
async function lockOwnAttempt(
  tx: DbTx,
  userId: string,
  attemptId: string
): Promise<ChallengeAttempt | undefined> {
  const [row] = await tx
    .select()
    .from(challengeAttempts)
    .where(and(eq(challengeAttempts.id, attemptId), eq(challengeAttempts.userId, userId)))
    .for('update');
  return row;
}

/**
 * The transition context for a stored row, or null when the row cannot be
 * judged by the rules this server runs: an unknown menu type, or a row played
 * under another rules version (whose stored state the current rules may read
 * differently).
 */
function attemptContext(
  row: ChallengeAttempt
): ChallengeAttemptContext<unknown, unknown, unknown> | null {
  const definition: ErasedChallengeModuleDefinition | null = getChallengeModule(row.menuType);
  if (!definition || row.rulesVersion !== CHALLENGE_RULES_VERSION) return null;
  return {
    definition,
    settings: row.settings,
    questions: row.questions,
    state: row.state,
    consumed: row.consumedAt !== null,
    startedAt: row.startedAt.getTime(),
    timeLimitMs: CHALLENGE_TIME_LIMIT * 1000,
    mistakeLimit: MISTAKE_LIMIT,
  };
}

async function consume(
  tx: DbTx,
  attemptId: string,
  now: number,
  outcome: ChallengeAttemptOutcome,
  challengeResultId: string | null
): Promise<void> {
  await tx
    .update(challengeAttempts)
    .set({ consumedAt: new Date(now), outcome, challengeResultId })
    .where(eq(challengeAttempts.id, attemptId));
}

/** The answer to a resent finish: what the row was consumed with. */
function storedOutcome(row: ChallengeAttempt): FinishChallengeAttemptResult {
  switch (row.outcome) {
    case 'recorded':
      return row.challengeResultId
        ? { status: 'recorded', challengeResultId: row.challengeResultId, grantedRanks: [] }
        : { status: 'rejected' };
    case 'unrecorded':
      return { status: 'unrecorded' };
    case 'implausible_speed':
      return { status: 'refused', reason: 'implausible_speed' };
    default:
      return { status: 'rejected' };
  }
}

function isAttemptId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function isAnswerSmallEnough(rawAnswer: unknown): boolean {
  try {
    const json = JSON.stringify(rawAnswer);
    return json === undefined || json.length <= MAX_ANSWER_JSON_LENGTH;
  } catch {
    // Not serialisable (a BigInt, say): no module's answer looks like that.
    return false;
  }
}
