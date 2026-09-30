import { and, eq, inArray } from 'drizzle-orm';
import 'server-only';

import {
  BENEFIT_ACTIVE_STATUSES,
  DISPLAYABLE_STATUSES,
} from '@/lib/billing/subscription-constants';
import { subscriptionStatusTag } from '@/lib/cache-tags';
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
    tag: subscriptionStatusTag,
    warning: 'Failed to check subscription status:',
  },
  selectActiveSubscription
);

/**
 * The same question as {@link hasActiveSubscription}, answered from the
 * database on every call and failing loud.
 *
 * For the one caller that is about to start a payment. `hasActiveSubscription`
 * serves its answer from a 60-second cache and answers `false` when the query
 * fails -- both right for deciding whether to show an ad, both wrong for
 * deciding whether to open a second Checkout: a subscriber who paid a moment
 * ago would still read as unsubscribed, and a database outage would read as
 * "go ahead". Stripe itself does not stop a customer from holding two
 * subscriptions to the same price, so this check is the only thing between a
 * double-click (or a stale /pricing tab) and a double charge.
 *
 * A failure is thrown, not coerced: the caller has to refuse the Checkout
 * when it cannot tell.
 */
export async function hasActiveSubscriptionUncached(userId: string): Promise<boolean> {
  const rows = await selectActiveSubscription(userId);
  return rows.length > 0;
}

function selectActiveSubscription(userId: string) {
  return db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, [...BENEFIT_ACTIVE_STATUSES])
      )
    )
    .limit(1);
}

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
