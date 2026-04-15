'use server';

import { redirect } from 'next/navigation';

import { SITE_URL } from '@/config';
import type Stripe from 'stripe';

import { getAuthenticatedUser } from '@/lib/auth';
import { getStripe, getStripePriceId } from '@/lib/billing/stripe';
import { getOrCreateStripeCustomerId } from '@/lib/billing/stripe-customer';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';

type CheckoutError = { error: 'rateLimited' | 'sessionCreationFailed' };

export async function createCheckoutSession(locale: string): Promise<CheckoutError> {
  const user = await getAuthenticatedUser();

  // Rate limit
  const rlResult = await checkRateLimit(user.id, RATE_LIMITS.createCheckoutSession);
  if ('error' in rlResult) {
    return { error: 'rateLimited' as const };
  }

  let stripeCustomerId: string;
  try {
    stripeCustomerId = await getOrCreateStripeCustomerId(user.id, user.email);
  } catch {
    return { error: 'sessionCreationFailed' as const };
  }

  // Create Checkout session
  let session: Stripe.Response<Stripe.Checkout.Session>;
  try {
    session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price: getStripePriceId(),
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/${locale}/mypage/subscription?status=success`,
      cancel_url: `${SITE_URL}/${locale}/pricing`,
      subscription_data: {
        metadata: { supabaseUserId: user.id },
      },
    });
  } catch {
    return { error: 'sessionCreationFailed' as const };
  }

  if (!session.url) {
    return { error: 'sessionCreationFailed' as const };
  }

  redirect(session.url);
}
