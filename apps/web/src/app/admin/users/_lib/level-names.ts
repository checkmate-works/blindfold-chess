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
    LEVEL_BUCKET_ORDER.map((bucket) => [bucket, t(`stats.levelBuckets.${bucket}`)])
  );
}
