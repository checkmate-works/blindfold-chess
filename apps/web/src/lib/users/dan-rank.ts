import { unstable_cache } from 'next/cache';

import { and, eq, gte } from 'drizzle-orm';
import 'server-only';

import { db, ranks, userRanks } from '@/lib/db';
import { withTimeout } from '@/lib/db-timeout';
import { DAN_TIER_MIN_LEVEL } from '@/lib/db/data/ranks';

/**
 * Cache tag for per-user rank-derived status (currently only the dan-tier
 * check below). Revalidated by the rank-granting flows right before they
 * refresh the `bfc_ads_hidden` cookie, so a fresh dan promotion is not
 * served a stale "no dan rank" from this cache. Reads also self-heal via
 * `revalidate: 60` even if a future granting path forgets the tag.
 */
export const RANK_STATUS_CACHE_TAG = 'rank-status';

/**
 * Whether the user holds any dan-tier rank (`level >= DAN_TIER_MIN_LEVEL`).
 *
 * This is the dan perk predicate: dan holders browse ad-free, permanently —
 * `user_ranks` is INSERT-only, so unlike a subscription or grant this can
 * never lapse. Derived from `user_ranks` on every check (cached) rather
 * than materialized into `user_grants`, so there is no second copy to keep
 * consistent, no backfill for pre-existing holders, and no way to end up
 * with a dan user whose perk silently went missing.
 *
 * Fails closed (ads shown) on DB errors, mirroring `hasActiveGrant`.
 */
export const hasDanTierRank = unstable_cache(
  async (userId: string): Promise<boolean> => {
    try {
      const [row] = await withTimeout(
        db
          .select({ id: userRanks.id })
          .from(userRanks)
          .innerJoin(ranks, eq(userRanks.rankId, ranks.id))
          .where(and(eq(userRanks.userId, userId), gte(ranks.level, DAN_TIER_MIN_LEVEL)))
          .limit(1)
      );
      return !!row;
    } catch (error) {
      console.warn('Failed to check dan-tier rank status:', error);
      return false;
    }
  },
  ['has-dan-tier-rank'],
  { tags: [RANK_STATUS_CACHE_TAG], revalidate: 60 }
);
