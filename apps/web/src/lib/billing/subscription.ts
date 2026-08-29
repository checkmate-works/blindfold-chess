import { and, eq, inArray } from 'drizzle-orm';
import 'server-only';

import {
  BENEFIT_ACTIVE_STATUSES,
  DISPLAYABLE_STATUSES,
} from '@/lib/billing/subscription-constants';
import { SUBSCRIPTION_STATUS_CACHE_TAG } from '@/lib/cache-tags';
import { db, subscriptions } from '@/lib/db';
import { cachedExistenceCheck } from '@/lib/db/cached-existence-check';

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
