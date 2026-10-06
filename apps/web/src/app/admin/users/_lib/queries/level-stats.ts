import { LEVEL_BANDS, getLevel, getLevelBand } from '@blindfold-chess/features/exp';
import type { User } from '@supabase/supabase-js';

export type LevelStat = {
  /** A `LEVEL_BANDS` id, or {@link NO_EXP_BUCKET}. */
  bucket: string;
  count: number;
};

/**
 * Bucket key for users with no `user_exp` row at all — they have never saved
 * a practice result, so they have no level to report. Kept apart from the
 * Lv0 tier (a row exists but holds under 100 Exp) because the two answer
 * different questions: "never started" versus "started and stopped".
 * Deliberately not a band id, so consumers must special-case it.
 */
export const NO_EXP_BUCKET = 'none';

/** Every bucket a level chart or filter can name, in display order. */
export const LEVEL_BUCKET_ORDER: readonly string[] = [
  NO_EXP_BUCKET,
  ...LEVEL_BANDS.map((b) => b.id),
];

/** Whether `value` names a level bucket (a band id or the no-exp bucket). */
export function isLevelBucket(value: string): boolean {
  return LEVEL_BUCKET_ORDER.includes(value);
}

/**
 * Resolve the bucket a user falls into from their cumulative Exp, or
 * `undefined` when they have no `user_exp` row.
 */
export function resolveLevelBucket(totalExp: number | undefined): string {
  return totalExp === undefined ? NO_EXP_BUCKET : getLevelBand(getLevel(totalExp)).id;
}

/**
 * Aggregate user counts grouped by level band, with a leading bucket for
 * users who have no Exp at all.
 *
 * Pure function — takes the already-fetched filtered population and each
 * user's cumulative Exp (absent for users without a `user_exp` row). Every
 * bucket is present in the result, including empty ones, so the chart keeps
 * a stable shape as the population shifts.
 */
export function aggregateLevelStats(
  users: User[],
  totalExpByUser: ReadonlyMap<string, number>
): LevelStat[] {
  const counts = new Map<string, number>(LEVEL_BUCKET_ORDER.map((bucket) => [bucket, 0]));
  for (const user of users) {
    const bucket = resolveLevelBucket(totalExpByUser.get(user.id));
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return LEVEL_BUCKET_ORDER.map((bucket) => ({ bucket, count: counts.get(bucket) ?? 0 }));
}
