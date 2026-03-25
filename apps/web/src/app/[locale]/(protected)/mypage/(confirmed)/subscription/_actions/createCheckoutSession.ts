'use server';

import { redirect } from 'next/navigation';

import { SITE_URL } from '@/config';
import { eq } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, stripeCustomers } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { stripe } from '@/lib/stripe';

export async function createCheckoutSession(locale: string) {
  const user = await getAuthenticatedUser();

  // Rate limit
  const rlResult = await checkRateLimit(user.id, RATE_LIMITS.createCheckoutSession);
  if ('error' in rlResult) {
    return { error: 'rateLimited' as const };
  }

  // Find or create Stripe customer
  let stripeCustomerId: string;

  const [existing] = await db
    .select({ stripeCustomerId: stripeCustomers.stripeCustomerId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, user.id))
    .limit(1);

  if (existing) {
    stripeCustomerId = existing.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabaseUserId: user.id },
    });
    await db.insert(stripeCustomers).values({
      userId: user.id,
      stripeCustomerId: customer.id,
    });
    stripeCustomerId = customer.id;
  }

  // Create Checkout session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${SITE_URL}/${locale}/mypage/subscription?status=success`,
    cancel_url: `${SITE_URL}/${locale}/pricing`,
    subscription_data: {
      metadata: { supabaseUserId: user.id },
    },
  });

  if (!session.url) {
    return { error: 'sessionCreationFailed' as const };
  }

  redirect(session.url);
}
