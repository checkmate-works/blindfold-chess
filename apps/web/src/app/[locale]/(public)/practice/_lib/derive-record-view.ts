import { detectScoreImprovement } from '@/lib/db/challenge-best-score';
import type { ScoreComparison } from '@/lib/db/score-comparison';

/**
 * What the record section says about the run, beyond the two history rows:
 *
 * - `first`    — the run resolved and there is nothing before it.
 * - `new-best` — the run beat the previous best by the leaderboard ordering
 *                (score, then fewer mistakes, then faster), the same rule that
 *                decides whether `challenge_best_scores` is updated.
 * - `none`     — no badge: an ordinary run, or a visit without a resolvable
 *                run (no `?grant=`), where history alone is shown.
 */
export type RecordStatus = 'first' | 'new-best' | 'none';

export type RecordView = {
  status: RecordStatus;
  previousBestScore: number | undefined;
  previousLastScore: number | undefined;
  /** Current score minus last score; `undefined` unless both are known. */
  diffFromLast: number | undefined;
};

/**
 * Pure projection of a `ScoreComparison` onto what the record section
 * renders. Kept separate from the query so the badge rule can be tested
 * without a database, and from the component so it can be reasoned about
 * without JSX.
 */
export function deriveRecordView(comparison: ScoreComparison): RecordView {
  const { current, previousBest, previousLast } = comparison;

  let status: RecordStatus = 'none';
  if (current) {
    const { isNewEntry, isImprovement } = detectScoreImprovement(current, previousBest);
    if (isNewEntry) status = 'first';
    else if (isImprovement) status = 'new-best';
  }

  return {
    status,
    previousBestScore: previousBest?.score,
    previousLastScore: previousLast?.score,
    diffFromLast: current && previousLast ? current.score - previousLast.score : undefined,
  };
}
