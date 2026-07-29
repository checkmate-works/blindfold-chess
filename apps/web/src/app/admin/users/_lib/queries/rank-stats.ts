import type { User } from '@supabase/supabase-js';

import type { ranks } from '@/lib/db';
import {
  ALL_RANK_SLUGS,
  BELT_COLOR_HEX,
  MUKYU_SLUG,
  RANK_COLORS,
  RANK_LEVEL_BY_SLUG,
  resolveHighestRankSlug,
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

  // A user's rank set may be sparse — skip-grants are allowed (e.g. a player
  // can hold 初段 with no kyū ranks at all) — or dense from walking up the
  // ladder. Either way, count each user only at their highest-level rank so
  // the buckets don't overlap. The rank FILTER on the list tab buckets by the
  // same rule (`getFilteredPopulation`), so clicking a bar lands on a list of
  // exactly this many users.
  for (const user of users) {
    const slugs = ctx.userSlugs.get(user.id);
    if (!slugs || slugs.size === 0) continue;
    rankedUserIds.add(user.id);

    const highestSlug = resolveHighestRankSlug(slugs);
    if (highestSlug !== null) {
      rankCountMap.set(highestSlug, (rankCountMap.get(highestSlug) ?? 0) + 1);
    }
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
      level: RANK_LEVEL_BY_SLUG.get(slug) ?? 0,
    };
  }).sort((a, b) => a.level - b.level);
}
