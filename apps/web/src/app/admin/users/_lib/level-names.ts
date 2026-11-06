import type { ServerTranslator } from '@/i18n/translator';

import { LEVEL_BUCKET_ORDER } from './queries/level-stats';

/**
 * Level bucket id → display label, for the admin users screens.
 *
 * Shared between the list and the stats chart for the same reason as
 * `buildRankNames`: the distribution bar navigates into the filtered list,
 * so the bar and the filter badge it produces must name the bucket alike.
 */
export function buildLevelBucketNames(t: ServerTranslator): Record<string, string> {
  return Object.fromEntries(
    // Admin.stats.levelBuckets.<bucket>: Admin.stats.levelBuckets.none, Admin.stats.levelBuckets.0, Admin.stats.levelBuckets.1-4, Admin.stats.levelBuckets.5-9, Admin.stats.levelBuckets.10-19, Admin.stats.levelBuckets.20-49, Admin.stats.levelBuckets.50plus (LEVEL_BUCKET_ORDER = NO_EXP_BUCKET + LEVEL_BANDS ids)
    LEVEL_BUCKET_ORDER.map((bucket) => [bucket, t(`stats.levelBuckets.${bucket}`)])
  );
}
