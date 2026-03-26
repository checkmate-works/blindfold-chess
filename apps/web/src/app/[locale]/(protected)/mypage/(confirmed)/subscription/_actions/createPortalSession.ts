'use server';

import { redirect } from 'next/navigation';

import { SITE_URL } from '@/config';

import { getAuthenticatedUser } from '@/lib/auth';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { stripe } from '@/lib/stripe';
import { getStripeCustomerId } from '@/lib/stripe-customer';

export async function createPortalSession(locale: string) {
  const user = await getAuthenticatedUser();

  // Rate limit
  const rlResult = await checkRateLimit(user.id, RATE_LIMITS.createPortalSession);
  if ('error' in rlResult) {
    return { error: 'rateLimited' as const };
  }

  const stripeCustomerId = await getStripeCustomerId(user.id);
  if (!stripeCustomerId) {
    return { error: 'noSubscription' as const };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${SITE_URL}/${locale}/mypage/subscription`,
  });

  redirect(session.url);
}
