import { NextResponse } from 'next/server';

import { DEFAULT_LOCALE } from '@/config';
import { isSupportedLocale } from '@/i18n/supported-locale';
import * as Sentry from '@sentry/nextjs';
import type Stripe from 'stripe';

import { ADS_HIDDEN_COOKIE_NAME, adsHiddenCookieOptions } from '@/lib/ads/ads-hidden-cookie';
import { refreshAdsHiddenCookieOnResponse } from '@/lib/ads/ads-hidden-cookie-writer';
import { authenticateAndGuardApi } from '@/lib/auth';
import { withReturnPath } from '@/lib/auth-return-path';
import { getStripe } from '@/lib/billing/stripe';
import { getStripeCustomerId } from '@/lib/billing/stripe-customer';
import { upsertSubscriptionMirror } from '@/lib/billing/stripe-webhook-handlers';
import { isSubscriptionActive } from '@/lib/billing/subscription-constants';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { captureError } from '@/lib/sentry/capture-error';

/**
 * Where Stripe Checkout sends the browser after payment (`success_url`).
 *
 * The subscription page used to be the `success_url` directly, and it reads
 * the mirror row from the database. Stripe redirects the browser the moment
 * payment completes and delivers `checkout.session.completed` separately, so
 * a user who arrived before the webhook saw "no active subscription" next to
 * a "your subscription is now active" banner. This route closes that gap: it
 * fetches the Checkout Session Stripe named in the URL, mirrors its
 * subscription itself, sets the ad-hide cookie, and only then sends the user
 * on to the subscription page. The webhook still arrives and writes the same
 * row (`upsertSubscriptionMirror` is shared), so nothing depends on this
 * route having run.
 *
 * ## Why the session's customer is checked against the signed-in user
 *
 * The session id comes from the URL. Anyone can put a session id there, and a
 * session id is not a secret -- it appears in the Stripe-hosted page's URL.
 * Without the check, a signed-in user who obtained someone else's session id
 * could have that subscription mirrored onto their own account. The route
 * therefore requires the session's `customer` to be the Stripe customer
 * recorded for the signed-in user, and answers 403 otherwise.
 *
 * ## Why the cookie is set to '1' directly on success
 *
 * `upsertSubscriptionMirror` expires the user's entitlement tag with
 * `expire: 60`, which lets the cached `false` be served for up to a minute
 * while it revalidates in the background. Recomputing the cookie through the
 * cache right after the write could therefore still read the pre-purchase
 * answer. The subscription that was just mirrored is the entitlement, so when
 * its status is benefit-active the cookie is written from that fact, the way
 * the dan-promotion path does; only when it is not (an `incomplete` first
 * payment, say) does the route fall back to the cached computation.
 *
 * ## Failure handling
 *
 * Every failure to talk to Stripe or to the database still redirects to the
 * subscription page rather than showing an error: the payment has happened,
 * and the webhook will mirror it within seconds. The `status=success` banner
 * is shown only when this route has confirmed a completed session with a
 * subscription, so a user who lands without that sees the page's own state
 * rather than a claim the page cannot yet back up.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get('locale');
  const locale = localeParam && isSupportedLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const subscriptionPagePath = `/${locale}/mypage/subscription`;
  const subscriptionPage = new URL(subscriptionPagePath, request.url);

  const guard = await authenticateAndGuardApi(RATE_LIMITS.checkoutReturn);
  if ('response' in guard) {
    if (guard.response.status === 401) {
      // The Stripe redirect is a top-level navigation and carries the session
      // cookie, so this is rare: the session expired during checkout. Signing
      // in resumes on the subscription page, where the webhook's row will be.
      return NextResponse.redirect(
        new URL(withReturnPath(`/${locale}/sign-in`, subscriptionPagePath), request.url)
      );
    }
    return guard.response;
  }
  const { user } = guard;

  const sessionId = searchParams.get('session_id');
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.redirect(subscriptionPage);
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });
  } catch (error) {
    captureError(error, '[stripe/checkout/return] failed to retrieve the Checkout Session');
    return NextResponse.redirect(subscriptionPage);
  }

  const sessionCustomerId =
    typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);
  const ownCustomerId = await getStripeCustomerId(user.id);
  if (!sessionCustomerId || !ownCustomerId || sessionCustomerId !== ownCustomerId) {
    Sentry.captureMessage(
      `checkout/return: session ${session.id} belongs to customer ${sessionCustomerId ?? 'none'}, not to the signed-in user's customer`,
      'warning'
    );
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const subscription =
    session.status === 'complete' &&
    session.mode === 'subscription' &&
    session.subscription &&
    typeof session.subscription !== 'string'
      ? session.subscription
      : null;
  if (!subscription) {
    return NextResponse.redirect(subscriptionPage);
  }

  const success = NextResponse.redirect(
    new URL(`${subscriptionPagePath}?status=success`, request.url)
  );

  try {
    await upsertSubscriptionMirror(user.id, subscription);
  } catch (error) {
    captureError(error, '[stripe/checkout/return] failed to mirror the subscription');
    await refreshCookieBestEffort(success, user.id);
    return success;
  }

  if (isSubscriptionActive(subscription)) {
    success.cookies.set(ADS_HIDDEN_COOKIE_NAME, '1', adsHiddenCookieOptions());
  } else {
    await refreshCookieBestEffort(success, user.id);
  }
  return success;
}

async function refreshCookieBestEffort(response: NextResponse, userId: string): Promise<void> {
  try {
    await refreshAdsHiddenCookieOnResponse(response, userId);
  } catch (error) {
    Sentry.captureException(error);
  }
}
