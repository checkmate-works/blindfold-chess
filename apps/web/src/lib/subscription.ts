import { unstable_cache } from 'next/cache';

import { and, eq, inArray } from 'drizzle-orm';
import 'server-only';

import { db, subscriptions } from '@/lib/db';
import { withTimeout } from '@/lib/db-timeout';

/** Statuses that grant active subscriber benefits (e.g., ad-free). */
export const BENEFIT_ACTIVE_STATUSES = ['active', 'trialing'] as const;

/** Statuses that indicate a displayable (non-terminal) subscription. */
export const DISPLAYABLE_STATUSES = ['active', 'trialing', 'past_due'] as const;

export const hasActiveSubscription = unstable_cache(
  async (userId: string): Promise<boolean> => {
    try {
      const [row] = await withTimeout(
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
      return !!row;
    } catch (error) {
      console.warn('Failed to check subscription status:', error);
      return false;
    }
  },
  ['has-active-subscription'],
  { tags: ['subscription-status'], revalidate: 60 }
);

export async function getUserSubscription(userId: string) {
  try {
    const [row] = await withTimeout(
      db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, userId),
            inArray(subscriptions.status, [...DISPLAYABLE_STATUSES])
          )
        )
        .limit(1)
    );
    return row ?? null;
  } catch (error) {
    console.warn('Failed to get user subscription:', error);
    return null;
  }
}
