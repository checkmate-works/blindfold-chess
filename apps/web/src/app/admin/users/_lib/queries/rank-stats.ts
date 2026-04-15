import type { User } from '@supabase/supabase-js';

import type { ranks } from '@/lib/db';
import {
  ALL_RANK_SLUGS,
  BELT_COLOR_HEX,
  MUKYU_SLUG,
  RANK_COLORS,
  ranksSeedData,
} from '@/lib/db/data/ranks';

type Rank = typeof ranks.$inferSelect;

export type RankStat = {
  slug: string;
  name: string;
  count: number;
  color: string;
  level: number;
};

/**
 * Context needed to aggregate rank stats: the full `ranks` table (for
 * rankId → slug lookups) and all user_ranks rows for the filtered user
 * population (keyed by userId for efficient lookups).
 */
export type RankStatsContext = {
  /** All rows from the `ranks` master table, keyed by id. */
  rankById: Map<string, Rank>;
  /** For each user id, the set of rank slugs they hold. */
  userSlugs: Map<string, Set<string>>;
};

/**
 * Aggregate user counts grouped by rank, including unranked (mukyu) users.
 *
 * Mukyu count = total filtered users - users who hold at least one rank.
 * Coming Soon ranks (with no requirements defined) are included with count 0.
 *
 * Pure function — takes the already-fetched filtered population and a
 * rank-resolution context.
 */
export function aggregateRankStats(users: User[], ctx: RankStatsContext): RankStat[] {
  const rankCountMap = new Map<string, number>();
  const rankedUserIds = new Set<string>();

  for (const user of users) {
    const slugs = ctx.userSlugs.get(user.id);
    if (!slugs || slugs.size === 0) continue;
    rankedUserIds.add(user.id);
    for (const slug of slugs) {
      rankCountMap.set(slug, (rankCountMap.get(slug) ?? 0) + 1);
    }
  }

  // Build level map from seed data + mukyu
  const levelMap = new Map<string, number>();
  levelMap.set(MUKYU_SLUG, 0);
  for (const seed of ranksSeedData) {
    levelMap.set(seed.slug, seed.level);
  }

  // Build results for all ranks in ALL_RANK_SLUGS order
  const mukyuCount = users.length - rankedUserIds.size;

  return ALL_RANK_SLUGS.map((slug) => {
    const colorName = RANK_COLORS[slug];
    const hexColor = BELT_COLOR_HEX[colorName] ?? '#888888';

    return {
      slug,
      name: slug, // Will be replaced with i18n label by the component
      count: slug === MUKYU_SLUG ? mukyuCount : (rankCountMap.get(slug) ?? 0),
      color: hexColor,
      level: levelMap.get(slug) ?? 0,
    };
  }).sort((a, b) => a.level - b.level);
}
