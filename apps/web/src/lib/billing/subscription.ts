import { and, eq, inArray } from 'drizzle-orm';
import 'server-only';

import {
  BENEFIT_ACTIVE_STATUSES,
  DISPLAYABLE_STATUSES,
} from '@/lib/billing/subscription-constants';
import { SUBSCRIPTION_STATUS_CACHE_TAG } from '@/lib/cache-tags';
import { db, subscriptions } from '@/lib/db';
import { cachedExistenceCheck } from '@/lib/db/cached-existence-check';

/**
 * True when the user holds a subscription that grants subscriber benefits.
 *
 * This is the SQL half of the rule `isSubscriptionActive` applies to a fetched
 * row: same status list, expressed as a filter so the database can answer
 * without shipping rows back. Keep the two in step.
 *
 * The result is cached per user and invalidated by cache tag, so it must not
 * depend on the current time — that is also why "active" is status alone and
 * does not look at `currentPeriodEnd`. See `isSubscriptionActive` for the full
 * reasoning.
 */
export const hasActiveSubscription = cachedExistenceCheck(
  {
    keyParts: ['has-active-subscription'],
    tag: SUBSCRIPTION_STATUS_CACHE_TAG,
    warning: 'Failed to check subscription status:',
  },
  (userId: string) =>
    db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          inArray(subscriptions.status, [...BENEFIT_ACTIVE_STATUSES])
        )
      )
      .limit(1)
);

export async function getUserSubscription(userId: string) {
  try {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          inArray(subscriptions.status, [...DISPLAYABLE_STATUSES])
        )
      )
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.warn('Failed to get user subscription:', error);
    return null;
  }
}
