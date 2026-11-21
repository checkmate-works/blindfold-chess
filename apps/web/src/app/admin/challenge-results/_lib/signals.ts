import type { ChallengeAttemptState } from '@blindfold-chess/features/challenge-attempt';

/**
 * The part of an attempt's state that the moderation list reads.
 *
 * Only the running totals. The per-answer log (`answers`) is emptied once an
 * attempt is 90 days old, while `elapsedMs`, `score` and `incorrectAnswers`
 * are kept, so a signal built on the totals reads the same for an old result
 * as for a new one.
 */
export type AttemptTotals = Pick<ChallengeAttemptState, 'elapsedMs' | 'score' | 'incorrectAnswers'>;

/**
 * Mean thinking time per answer of a server-run attempt, in milliseconds.
 *
 * `elapsedMs` is the server-measured thinking time up to the last accepted
 * answer, and every accepted answer is either a point or a mistake, so the
 * mean is `elapsedMs / (score + incorrectAnswers)`. An attempt that took no
 * answers has no mean and returns `null`.
 *
 * This is shown as evidence next to the score, not compared against a
 * threshold: the list leaves the judgement to the admin.
 */
export function meanThinkMs(totals: AttemptTotals): number | null {
  const answered = totals.score + totals.incorrectAnswers;
  if (answered <= 0) return null;
  return totals.elapsedMs / answered;
}

/** The columns of a result row that its pace is computed from. */
export type ResultTotals = { timeTaken: number; score: number; incorrectAnswers: number };

/**
 * Seconds per answer of a recorded result, from the result row itself.
 *
 * Every result has this, including a legacy one, which has no attempt and so
 * no `meanThinkMs`: before scores were recorded from server-run attempts they
 * are the rows most worth checking, and this is the only speed figure they
 * carry. It is coarser than the attempt's mean: `timeTaken` is whole seconds
 * and, for a legacy result, was reported by the client. A forged score that
 * also reports a believable time is not caught by it.
 *
 * The list's `pace` order and its `maxPaceSeconds` filter compute the same
 * ratio in SQL (`queries.ts`); keep them in step.
 */
export function secondsPerAnswer(totals: ResultTotals): number | null {
  const answered = totals.score + totals.incorrectAnswers;
  if (answered <= 0) return null;
  return totals.timeTaken / answered;
}

/**
 * A `?pace=` value as the list's upper bound on seconds per answer, or `null`
 * when it is not a usable bound (missing, not a number, zero or negative).
 */
export function parseMaxPace(value: number | null): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}
