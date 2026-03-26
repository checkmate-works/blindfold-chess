'use server';

import { redirect } from 'next/navigation';

import { SITE_URL } from '@/config';

import { getAuthenticatedUser } from '@/lib/auth';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { STRIPE_PRICE_ID, stripe } from '@/lib/stripe';
import { getOrCreateStripeCustomerId } from '@/lib/stripe-customer';

type CheckoutError = { error: 'rateLimited' | 'sessionCreationFailed' };

export async function createCheckoutSession(locale: string): Promise<CheckoutError> {
  const user = await getAuthenticatedUser();

  // Rate limit
  const rlResult = await checkRateLimit(user.id, RATE_LIMITS.createCheckoutSession);
  if ('error' in rlResult) {
    return { error: 'rateLimited' as const };
  }

  const stripeCustomerId = await getOrCreateStripeCustomerId(user.id, user.email);

  // Create Checkout session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [
      {
        price: STRIPE_PRICE_ID,
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
