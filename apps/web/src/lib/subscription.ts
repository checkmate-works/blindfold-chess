import { unstable_cache } from 'next/cache';

import { and, eq, inArray } from 'drizzle-orm';
import 'server-only';

import { db, subscriptions } from '@/lib/db';

const DB_QUERY_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('DB query timeout')), ms)),
  ]);
}

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
              inArray(subscriptions.status, ['active', 'trialing'])
            )
          )
          .limit(1),
        DB_QUERY_TIMEOUT_MS
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
            inArray(subscriptions.status, ['active', 'trialing', 'past_due'])
          )
        )
        .limit(1),
      DB_QUERY_TIMEOUT_MS
    );
    return row ?? null;
  } catch (error) {
    console.warn('Failed to get user subscription:', error);
    return null;
  }
}
