import { and, desc, eq, isNull } from 'drizzle-orm';

import { hasAdFreeEntitlement } from '@/lib/ads/ad-free-entitlement';
import { getUserSubscription } from '@/lib/billing/subscription';
import { db, userGrants } from '@/lib/db';
import { hasDanTierRank } from '@/lib/users/dan-rank';

import {
  type EntitlementRow,
  VISIBLE_GRANT_COUNT,
  buildEntitlementSummary,
} from './entitlement-rows';
import { resolveGrantSources } from './resolve-grant-sources';

export type BenefitsPageData = {
  /** Whether the user browses ad-free right now, from any source. */
  adFreeActive: boolean;
  /**
   * True when the entitlement has no end date, so the page must not print one.
   * Only the dan-tier belt perk is permanent today.
   */
  adFreePermanent: boolean;
  /** Latest expiresAt across the active subscription's period and the active grants, or null if the user has neither. */
  latestExpiresAt: Date | null;
  /** Up to {@link VISIBLE_GRANT_COUNT} most recent entitlement rows (subscription + grants), sorted by startsAt desc. */
  entitlementRows: EntitlementRow[];
  /** True when more than {@link VISIBLE_GRANT_COUNT} grants exist for this user (subscription is not counted). */
  hasMoreGrants: boolean;
};

/**
 * Aggregates the user's `ad_free` entitlements from both Stripe subscriptions
 * and the `user_grants` table, and shapes them into the rows + banner inputs
 * needed by `/mypage/benefits`.
 *
 * Soft-deleted (`revokedAt IS NOT NULL`) grants are excluded. Source rows for
 * the visible top-5 grants are resolved via batched IN queries to avoid N+1
 * lookups; hard-deleted source rows fall back to a non-link label.
 *
 * `adFreeActive` is asked of {@link hasAdFreeEntitlement} instead of being
 * re-derived from the rows collected here, because the rows are not the whole
 * truth: the dan-tier belt perk makes a user ad-free without ever writing a
 * `user_grants` row or a subscription. A dan holder with neither of those has
 * nothing to aggregate, so this page used to report the benefit as inactive —
 * and offer the "how to earn it" link — to users whose ads were already hidden
 * everywhere else on the site.
 *
 * That perk is also permanent (`user_ranks` is INSERT-only, so a dan rank
 * cannot lapse), which is why permanence is reported separately rather than as
 * a far-future `latestExpiresAt`. `adFreePermanent` takes precedence over the
 * date in the banner: a dan holder who also subscribes keeps ad-free browsing
 * after the subscription's period ends, so showing that period end would
 * understate what they hold. `latestExpiresAt` stays exactly what its name
 * says — the subscription/grant horizon, null when there is neither — and the
 * entitlement table keeps listing only rows that really exist.
 *
 * The dan lookup runs twice per request in principle (once inside
 * `hasAdFreeEntitlement`, once here), but `hasDanTierRank` is a tag-invalidated
 * cached existence check, so both calls answer from the same cache entry.
 */
export async function getBenefitsPageData(userId: string): Promise<BenefitsPageData> {
  const [subscription, allGrants, adFreeActive, adFreePermanent] = await Promise.all([
    getUserSubscription(userId),
    db
      .select()
      .from(userGrants)
      .where(
        and(
          eq(userGrants.userId, userId),
          eq(userGrants.benefitType, 'ad_free'),
          isNull(userGrants.revokedAt)
        )
      )
      .orderBy(desc(userGrants.startsAt)),
    hasAdFreeEntitlement(userId),
    hasDanTierRank(userId),
  ]);

  // Resolve each visible grant's source row (topic_post or position) so the
  // table can show "which submission earned me this" as a link. Batched into
  // two IN queries to avoid N+1, scoped to the rows actually rendered.
  const sources = await resolveGrantSources(allGrants.slice(0, VISIBLE_GRANT_COUNT));

  const { latestExpiresAt, entitlementRows, hasMoreGrants } = buildEntitlementSummary({
    subscription,
    grants: allGrants,
    sources,
    now: new Date(),
  });

  return {
    adFreeActive,
    adFreePermanent,
    latestExpiresAt,
    entitlementRows,
    hasMoreGrants,
  };
}
