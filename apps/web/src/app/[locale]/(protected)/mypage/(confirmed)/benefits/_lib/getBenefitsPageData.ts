import { and, desc, eq, isNull } from 'drizzle-orm';

import { hasAdFreeEntitlement } from '@/lib/ads/ad-free-entitlement';
import { getUserSubscription } from '@/lib/billing/subscription';
import { isSubscriptionActive } from '@/lib/billing/subscription-constants';
import { db, userGrants } from '@/lib/db';
import { type GrantType, isGrantType } from '@/lib/db/data/grant-types';
import { hasDanTierRank } from '@/lib/users/dan-rank';
import type { GrantPeriodStatus } from '@/lib/users/user-grants';
import { classifyGrantPeriod } from '@/lib/users/user-grants';

import { resolveGrantSources } from './resolve-grant-sources';
import { resolveGrantSourceMeta } from './source';

export type RowStatus = GrantPeriodStatus;

/**
 * Discriminator used by the page to pick the i18n key for `sourceLabel`.
 * The loader stays free of `next-intl` so it remains pure I/O + domain logic.
 *
 *   - `'subscription'` → `t('adFree.sourceSubscription')`
 *   - others           → `t(`grantTypeLabel.${labelKey}`)`
 */
export type EntitlementSourceLabelKey =
  'subscription' | 'admin_manual' | 'topic_post' | 'position_creation';

type EntitlementRow = {
  id: string;
  sourceLabelKey: EntitlementSourceLabelKey;
  /**
   * Locale-prefixed-less absolute path to the post / position that triggered
   * this grant, when resolvable. Null for the subscription row, admin_manual
   * grants, and grants whose source row could not be looked up (e.g., the
   * post was hard-deleted).
   */
  sourceHref: string | null;
  startsAt: Date;
  expiresAt: Date;
  status: RowStatus;
};

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
  /** Up to 5 most recent entitlement rows (subscription + grants), sorted by startsAt desc. */
  entitlementRows: EntitlementRow[];
  /** True when more than 5 grants exist for this user (subscription is not counted). */
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

  const now = new Date();

  const subscriptionActive = subscription !== null && isSubscriptionActive(subscription);

  const subscriptionExpiresAt = subscriptionActive ? new Date(subscription.currentPeriodEnd) : null;

  const activeGrants = allGrants.filter(
    (g) => classifyGrantPeriod(now, new Date(g.startsAt), new Date(g.expiresAt)) === 'active'
  );
  const latestGrantExpiresAt = activeGrants.reduce<Date | null>((acc, g) => {
    const exp = new Date(g.expiresAt);
    return !acc || exp > acc ? exp : acc;
  }, null);

  const latestExpiresAt = [subscriptionExpiresAt, latestGrantExpiresAt]
    .filter((d): d is Date => d !== null)
    .reduce<Date | null>((max, d) => (!max || d > max ? d : max), null);

  // Resolve each visible grant's source row (topic_post or position) so the
  // table can show "which submission earned me this" as a link. Batched into
  // two IN queries to avoid N+1, scoped to the 5 rows actually rendered.
  const recentGrants = allGrants.slice(0, 5);
  const { topicPostMap, positionMap } = await resolveGrantSources(recentGrants);

  const subscriptionRow: EntitlementRow | null =
    subscriptionActive && subscription && subscriptionExpiresAt
      ? {
          id: 'subscription',
          sourceLabelKey: 'subscription',
          sourceHref: null,
          startsAt: new Date(subscription.currentPeriodStart),
          expiresAt: subscriptionExpiresAt,
          status: 'active',
        }
      : null;

  const grantRows: EntitlementRow[] = recentGrants.map((g) => {
    const startsAt = new Date(g.startsAt);
    const expiresAt = new Date(g.expiresAt);
    const grantTypeKey: GrantType = isGrantType(g.grantType) ? g.grantType : 'admin_manual';

    const { labelKey, href } = resolveGrantSourceMeta(
      { grantType: grantTypeKey, sourceType: g.sourceType, sourceId: g.sourceId },
      topicPostMap,
      positionMap
    );

    return {
      id: g.id,
      sourceLabelKey: labelKey,
      sourceHref: href,
      startsAt,
      expiresAt,
      status: classifyGrantPeriod(now, startsAt, expiresAt),
    };
  });

  const entitlementRows: EntitlementRow[] = [
    ...(subscriptionRow ? [subscriptionRow] : []),
    ...grantRows,
  ].toSorted((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  return {
    adFreeActive,
    adFreePermanent,
    latestExpiresAt,
    entitlementRows,
    hasMoreGrants: allGrants.length > 5,
  };
}
