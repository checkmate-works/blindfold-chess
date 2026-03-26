import { eq } from 'drizzle-orm';
import 'server-only';

import { db, stripeCustomers } from '@/lib/db';
import { stripe } from '@/lib/stripe';

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

  const customer = await stripe.customers.create({
    email,
    metadata: { supabaseUserId: userId },
  });

  await db.insert(stripeCustomers).values({
    userId,
    stripeCustomerId: customer.id,
  });

  return customer.id;
}
