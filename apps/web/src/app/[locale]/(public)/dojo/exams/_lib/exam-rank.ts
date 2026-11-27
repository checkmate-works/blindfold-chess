import { RANK_SLUGS } from '@blindfold-chess/features/dojo-ranks';
import type { EarnedRankSlug, RankSlug } from '@blindfold-chess/features/dojo-ranks';

/**
 * The rank right below `rank` — the one a player has to hold before a pass at
 * `rank` is recorded.
 */
export function previousRank(rank: EarnedRankSlug): RankSlug {
  return RANK_SLUGS[RANK_SLUGS.indexOf(rank) - 1] ?? 'mukyu';
}
