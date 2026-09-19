'use server';

import { redirect } from 'next/navigation';

import { SITE_URL } from '@/config';
import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import type Stripe from 'stripe';

import { authenticateAndGuard } from '@/lib/auth';
import { getStripe, getStripePriceId } from '@/lib/billing/stripe';
import { getOrCreateStripeCustomerId } from '@/lib/billing/stripe-customer';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { captureError } from '@/lib/sentry/capture-error';

type GuardError = 'signInRequired' | 'banned' | 'rateLimited';
type CheckoutError = { error: GuardError | 'sessionCreationFailed' };

/**
 * Starts a Stripe Checkout session for the ad-free subscription.
 *
 * Guarded by `authenticateAndGuard` (auth + ban + rate limit) rather than by
 * the `(protected)` layout: this action is called from the public `/pricing`
 * page, and a Server Action is a POST endpoint that no layout renders around.
 * The layout's `/banned` redirect protects the mypage HTML, not this call, so
 * without the ban check a banned account could pay for a subscription it can
 * never use, and the webhook would then grant it the entitlement.
 */
export async function createCheckoutSession(locale: string): Promise<CheckoutError> {
  assertSupportedLocale(locale);

  const guard = await authenticateAndGuard(RATE_LIMITS.createCheckoutSession);
  if ('error' in guard) {
    // The guard types its code as `string`; these three are the only values
    // it emits (see its TSDoc in `@/lib/auth`).
    return { error: guard.error as GuardError };
  }
  const { user } = guard;

  let stripeCustomerId: string;
  try {
    stripeCustomerId = await getOrCreateStripeCustomerId(user.id, user.email);
  } catch (error) {
    captureError(error, '[createCheckoutSession] failed to resolve Stripe customer');
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
  } catch (error) {
    captureError(error, '[createCheckoutSession] Stripe checkout session creation failed');
    return { error: 'sessionCreationFailed' as const };
  }

  if (!session.url) {
    return { error: 'sessionCreationFailed' as const };
  }

  redirect(session.url);
}
