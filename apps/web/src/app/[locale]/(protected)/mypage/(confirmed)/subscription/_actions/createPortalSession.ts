'use server';

import { redirect } from 'next/navigation';

import { SITE_URL } from '@/config';
import type Stripe from 'stripe';

import { getAuthenticatedUser } from '@/lib/auth';
import { getStripe } from '@/lib/billing/stripe';
import { getStripeCustomerId } from '@/lib/billing/stripe-customer';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';

type PortalError = { error: 'rateLimited' | 'noSubscription' | 'portalSessionFailed' };

export async function createPortalSession(locale: string): Promise<PortalError> {
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

  let session: Stripe.Response<Stripe.BillingPortal.Session>;
  try {
    session = await getStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${SITE_URL}/${locale}/mypage/subscription`,
    });
  } catch {
    return { error: 'portalSessionFailed' as const };
  }

  redirect(session.url);
}
