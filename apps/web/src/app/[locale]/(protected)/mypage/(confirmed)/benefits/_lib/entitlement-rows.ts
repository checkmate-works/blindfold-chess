import { isSubscriptionActive } from '@/lib/billing/subscription-constants';
import { type GrantType, isGrantType } from '@/lib/db/data/grant-types';
import type { Subscription, UserGrant } from '@/lib/db/schema';
import type { GrantPeriodStatus } from '@/lib/users/user-grants';
import { classifyGrantPeriod } from '@/lib/users/user-grants';

import { type PositionMeta, type TopicPostMeta, resolveGrantSourceMeta } from './source';

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

export type EntitlementRow = {
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

/** Grants listed on the page; the rest are behind the history link. */
export const VISIBLE_GRANT_COUNT = 5;

type GrantRow = Pick<
  UserGrant,
  'id' | 'grantType' | 'sourceType' | 'sourceId' | 'startsAt' | 'expiresAt'
>;

type SubscriptionPeriod = Pick<Subscription, 'status' | 'currentPeriodStart' | 'currentPeriodEnd'>;

/**
 * Shape the fetched subscription and `ad_free` grants into the banner horizon
 * and the entitlement table.
 *
 * @param grants - Non-revoked `ad_free` grants, newest `startsAt` first.
 * @param sources - Source rows for the first {@link VISIBLE_GRANT_COUNT}
 *   grants, as returned by `resolveGrantSources`.
 */
export function buildEntitlementSummary({
  subscription,
  grants,
  sources,
  now,
}: {
  subscription: SubscriptionPeriod | null;
  grants: readonly GrantRow[];
  sources: { topicPostMap: Map<string, TopicPostMeta>; positionMap: Map<string, PositionMeta> };
  now: Date;
}): { latestExpiresAt: Date | null; entitlementRows: EntitlementRow[]; hasMoreGrants: boolean } {
  const subscriptionActive = subscription !== null && isSubscriptionActive(subscription);

  const subscriptionExpiresAt = subscriptionActive ? new Date(subscription.currentPeriodEnd) : null;

  const activeGrants = grants.filter(
    (g) => classifyGrantPeriod(now, new Date(g.startsAt), new Date(g.expiresAt)) === 'active'
  );
  const latestGrantExpiresAt = activeGrants.reduce<Date | null>((acc, g) => {
    const exp = new Date(g.expiresAt);
    return !acc || exp > acc ? exp : acc;
  }, null);

  const latestExpiresAt = [subscriptionExpiresAt, latestGrantExpiresAt]
    .filter((d): d is Date => d !== null)
    .reduce<Date | null>((max, d) => (!max || d > max ? d : max), null);

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

  const grantRows: EntitlementRow[] = grants.slice(0, VISIBLE_GRANT_COUNT).map((g) => {
    const startsAt = new Date(g.startsAt);
    const expiresAt = new Date(g.expiresAt);
    const grantTypeKey: GrantType = isGrantType(g.grantType) ? g.grantType : 'admin_manual';

    const { labelKey, href } = resolveGrantSourceMeta(
      { grantType: grantTypeKey, sourceType: g.sourceType, sourceId: g.sourceId },
      sources.topicPostMap,
      sources.positionMap
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
    latestExpiresAt,
    entitlementRows,
    hasMoreGrants: grants.length > VISIBLE_GRANT_COUNT,
  };
}
