import { eq } from 'drizzle-orm';
import 'server-only';

import { getStripe } from '@/lib/billing/stripe';
import { db, stripeCustomers } from '@/lib/db';

export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const [record] = await db
    .select({ stripeCustomerId: stripeCustomers.stripeCustomerId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId))
    .limit(1);

  return record?.stripeCustomerId ?? null;
}

export async function getOrCreateStripeCustomerId(
  userId: string,
  email: string | undefined
): Promise<string> {
  const existing = await getStripeCustomerId(userId);
  if (existing) return existing;

  const customer = await getStripe().customers.create({
    email,
    metadata: { supabaseUserId: userId },
  });

  const result = await db
    .insert(stripeCustomers)
    .values({ userId, stripeCustomerId: customer.id })
    .onConflictDoNothing({ target: stripeCustomers.userId })
    .returning({ stripeCustomerId: stripeCustomers.stripeCustomerId });

  if (result.length === 0) {
    // Race: another request already inserted. Clean up the orphaned Stripe customer.
    await getStripe().customers.del(customer.id);
    const winner = await getStripeCustomerId(userId);
    if (!winner) {
      throw new Error(
        `Failed to retrieve Stripe customer ID for user ${userId} after conflict resolution`
      );
    }
    return winner;
  }

  return customer.id;
}
