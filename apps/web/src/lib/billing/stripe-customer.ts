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

/**
 * The Stripe customer for a user, created on first use.
 *
 * Two requests for the same user can reach the create step together (a
 * double-click on "subscribe", two tabs). The Stripe call carries an
 * idempotency key derived from the user id, so Stripe answers both with the
 * same customer instead of minting two; the `ON CONFLICT DO NOTHING` insert
 * then lets one request record it and the other read it back. Stripe keeps
 * an idempotency key for 24 hours, so a request whose database insert failed
 * after the customer was created also gets the same customer back on retry
 * rather than leaving one behind.
 *
 * What the key does not cover: a second request that arrives while the first
 * is still in flight at Stripe is answered 409 rather than made to wait. That
 * surfaces to the caller as a failed Checkout start, and the user's retry a
 * moment later finds the row the first request wrote. It is left as an error
 * on purpose -- a retry loop here would sit on a Server Action's response
 * time for a race that needs two clicks within one Stripe round-trip.
 *
 * The orphan clean-up in the conflict branch is reached only when the two
 * requests were made more than 24 hours apart with the first one's insert
 * having failed, so that Stripe no longer remembers the key and did create a
 * second customer. Then the loser is the one with nothing pointing at it,
 * and deleting it keeps the Stripe dashboard from filling with customers
 * that have no account.
 */
export async function getOrCreateStripeCustomerId(
  userId: string,
  email: string | undefined
): Promise<string> {
  const existing = await getStripeCustomerId(userId);
  if (existing) return existing;

  const customer = await getStripe().customers.create(
    {
      email,
      metadata: { supabaseUserId: userId },
    },
    { idempotencyKey: stripeCustomerIdempotencyKey(userId) }
  );

  const result = await db
    .insert(stripeCustomers)
    .values({ userId, stripeCustomerId: customer.id })
    .onConflictDoNothing({ target: stripeCustomers.userId })
    .returning({ stripeCustomerId: stripeCustomers.stripeCustomerId });

  if (result.length === 0) {
    const winner = await getStripeCustomerId(userId);
    if (!winner) {
      throw new Error(
        `Failed to retrieve Stripe customer ID for user ${userId} after conflict resolution`
      );
    }
    if (winner !== customer.id) {
      await getStripe().customers.del(customer.id);
    }
    return winner;
  }

  return customer.id;
}

/**
 * Exported for the test that pins the key's shape: the key is what makes two
 * concurrent creates collapse into one customer, so a change to it is a
 * behaviour change, not a rename.
 */
export function stripeCustomerIdempotencyKey(userId: string): string {
  return `stripe-customer-create:${userId}`;
}
