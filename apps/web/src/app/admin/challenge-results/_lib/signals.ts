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
