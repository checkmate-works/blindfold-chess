'use server';

import { redirect } from 'next/navigation';

import { SITE_URL } from '@/config';
import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import type Stripe from 'stripe';

import { authenticateAndGuard } from '@/lib/auth';
import { getStripe } from '@/lib/billing/stripe';
import { getStripeCustomerId } from '@/lib/billing/stripe-customer';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { captureError } from '@/lib/sentry/capture-error';

type GuardError = 'signInRequired' | 'banned' | 'rateLimited';
type PortalError = { error: GuardError | 'noSubscription' | 'portalSessionFailed' };

/**
 * Opens the Stripe Billing Portal for the signed-in customer.
 *
 * Guarded by `authenticateAndGuard` (auth + ban + rate limit). The
 * `(protected)` layout redirects a banned user away from the subscription
 * page, but a Server Action is a POST endpoint that no layout renders around,
 * so the ban has to be checked here as well or the portal stays reachable by
 * a direct call.
 */
export async function createPortalSession(locale: string): Promise<PortalError> {
  assertSupportedLocale(locale);

  const guard = await authenticateAndGuard(RATE_LIMITS.createPortalSession);
  if ('error' in guard) {
    // The guard types its code as `string`; these three are the only values
    // it emits (see its TSDoc in `@/lib/auth`).
    return { error: guard.error as GuardError };
  }
  const { user } = guard;

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
  } catch (error) {
    captureError(error, '[createPortalSession] Stripe billing portal session creation failed');
    return { error: 'portalSessionFailed' as const };
  }

  redirect(session.url);
}
