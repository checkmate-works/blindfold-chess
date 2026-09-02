import { and, desc, eq, isNull } from 'drizzle-orm';

import { getUserSubscription } from '@/lib/billing/subscription';
import { isSubscriptionActive } from '@/lib/billing/subscription-constants';
import { db, userGrants } from '@/lib/db';
import { type GrantType, isGrantType } from '@/lib/db/data/grant-types';
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
  adFreeActive: boolean;
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
 */
export async function getBenefitsPageData(userId: string): Promise<BenefitsPageData> {
  const [subscription, allGrants] = await Promise.all([
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

  const adFreeActive = latestExpiresAt !== null;

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
    latestExpiresAt,
    entitlementRows,
    hasMoreGrants: allGrants.length > 5,
  };
}
