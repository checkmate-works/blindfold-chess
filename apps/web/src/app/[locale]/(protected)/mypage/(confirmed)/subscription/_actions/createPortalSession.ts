'use server';

import { redirect } from 'next/navigation';

import { SITE_URL } from '@/config';
import { eq } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, stripeCustomers } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { stripe } from '@/lib/stripe';

export async function createPortalSession(locale: string) {
  const user = await getAuthenticatedUser();

  // Rate limit
  const rlResult = await checkRateLimit(user.id, RATE_LIMITS.createPortalSession);
  if ('error' in rlResult) {
    return { error: 'rateLimited' as const };
  }

  // Get Stripe customer ID
  const [record] = await db
    .select({ stripeCustomerId: stripeCustomers.stripeCustomerId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, user.id))
    .limit(1);

  if (!record) {
    return { error: 'noSubscription' as const };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: record.stripeCustomerId,
    return_url: `${SITE_URL}/${locale}/mypage/subscription`,
  });

  redirect(session.url);
}
