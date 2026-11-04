import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { applyAdsHiddenCookieValue } from '@/lib/ads/ads-hidden-cookie';
import { computeAdsHiddenValueForUser } from '@/lib/ads/ads-hidden-cookie-compute';
import { getOptionalUser } from '@/lib/auth';
import { resolveReturnPath, withReturnPath } from '@/lib/auth-return-path';
import { db, profiles } from '@/lib/db';
import { getLocaleFromRequest } from '@/lib/locale';
import { captureError } from '@/lib/sentry/capture-error';
import { createClient } from '@/lib/supabase/server';
import {
  LINK_RETURN_GOOGLE,
  LINK_RETURN_PARAM,
  accountPageHref,
} from '@/lib/users/account-page-notice';
import { logActivityEvent } from '@/lib/users/activity-log';

/**
 * Auth callback handler.
 *
 * Handles six types of callbacks:
 * 1. OAuth `code` — exchanges authorization code for session (existing flow)
 * 2. `code` + `type=recovery` — PKCE recovery flow, exchanges code and redirects to password reset
 * 3. `token_hash` + `type=signup` — verifies signup email confirmation OTP
 * 4. `token_hash` + `type=recovery` — verifies recovery OTP, redirects to password reset page
 * 5. `token_hash` + `type=email_change` — verifies email change OTP. Both the old and the new
 *    address get a link; the first one opened is accepted without a session, the second
 *    completes the change and issues one. Each lands on the account page with a notice.
 * 6. `link=google` + `code` / `error_code` — the return leg of "Add a Google account"
 *    (`linkIdentity`) on the account page. Not a sign-in: both outcomes go back to the
 *    account page with a notice (`accountPageHref`).
 *
 * Note: The login session is established here (via exchangeCodeForSession or verifyOtp)
 * BEFORE the user sets their username. This is because the OAuth
 * authorization code is single-use and short-lived — if we don't
 * exchange it immediately, we lose the user's identity entirely.
 *
 * Users without a profile are redirected to the username setup page,
 * and the protected layout guard prevents access to other pages
 * until onboarding is complete.
 */

async function handleSuccessfulAuth(
  userId: string,
  locale: string,
  origin: string,
  safeNext: string
): Promise<NextResponse> {
  logActivityEvent({
    userId,
    action: 'login',
  });

  const [profile, adsHiddenValue] = await Promise.all([
    db
      .select({ username: profiles.username })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)
      .then((rows) => rows[0]),
    // Initialize the `bfc_ads_hidden` cookie based on the freshly-signed-in
    // user's entitlement state. Subsequent visits refresh this cookie via
    // `getSessionUser()` (called by `AuthProvider` on every mount) and via
    // the request proxy (`apps/web/src/proxy.ts`) on `/mypage/subscription`
    // — including the Stripe success landing. See
    // `@/lib/ads/ads-hidden-cookie.ts` for the overall no-flash flow.
    //
    // A transient failure here (DB blip, Supabase timeout) is isolated so
    // sign-in still succeeds: the cookie is deleted (null), the user sees
    // ads for their first few page loads, and the next `getSessionUser()`
    // call self-corrects the state. The error is reported to Sentry so the
    // regression is observable.
    computeAdsHiddenValueForUser(userId).catch((error) => {
      captureError(error, '[auth/callback] failed to compute the ads-hidden cookie');
      return null;
    }),
  ]);

  if (!profile) {
    // A new user always goes through username setup and onboarding; any
    // `next` on the callback URL is deliberately dropped. Threading it
    // through was tried and abandoned: the email-confirmation hop makes it
    // unreliable, so funnel tails (e.g. "sign up and publish this game")
    // are picked up by in-app surfaces instead — the /games publish nudge
    // and the shared-game claim banner.
    const setupUrl = new URL(`/${locale}/mypage/setup-username`, origin);
    const response = NextResponse.redirect(setupUrl);
    applyAdsHiddenCookieValue(response.cookies, adsHiddenValue);
    return response;
  }

  const redirectUrl = new URL(safeNext, origin);
  redirectUrl.searchParams.set('toast', 'login_success');
  const response = NextResponse.redirect(redirectUrl);
  applyAdsHiddenCookieValue(response.cookies, adsHiddenValue);
  return response;
}

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Email change confirmation. With `double_confirm_changes` on, the old and the
 * new address each get an `email_change` link, and the change completes only
 * once both have been opened.
 *
 * The first link verifies without issuing a session; the second completes the
 * change and does. The links are often opened on a device other than the one
 * that started the change (a phone's mail app), so a visitor without a
 * session is sent through sign-in with the account page as the return path
 * instead of being bounced to a generic error.
 */
async function handleEmailChangeOtp(
  supabase: ServerSupabase,
  tokenHash: string,
  locale: string,
  origin: string
): Promise<NextResponse> {
  const { error, data } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email_change',
  });
  if (error) {
    if (await getOptionalUser()) {
      return NextResponse.redirect(`${origin}${accountPageHref(locale, 'emailChangeLinkInvalid')}`);
    }
    return NextResponse.redirect(`${origin}/${locale}/sign-in?error=auth_callback_error`);
  }
  if (data.session) {
    logActivityEvent({ userId: data.session.user.id, action: 'change_email' });
    return NextResponse.redirect(`${origin}${accountPageHref(locale, 'emailChangeDone')}`);
  }
  const pending = accountPageHref(locale, 'emailChangePending');
  if (await getOptionalUser()) {
    return NextResponse.redirect(`${origin}${pending}`);
  }
  return NextResponse.redirect(`${origin}${withReturnPath(`/${locale}/sign-in`, pending)}`);
}

/**
 * Return leg of "Add a Google account" (`linkIdentity`).
 *
 * The auth server comes back with `code` on success and `error_code` on
 * failure. A Google account that is already linked — to this account or to
 * another one — is `identity_already_exists` in both cases. Exchanging the
 * success `code` only re-issues a session for the same user, so no `login`
 * activity is recorded.
 */
async function handleLinkReturn(
  supabase: ServerSupabase,
  searchParams: URLSearchParams,
  locale: string,
  origin: string
): Promise<NextResponse> {
  const code = searchParams.get('code');
  if (searchParams.get('error') || searchParams.get('error_code') || !code) {
    const notice =
      searchParams.get('error_code') === 'identity_already_exists' ? 'linkDuplicate' : 'linkFailed';
    return NextResponse.redirect(`${origin}${accountPageHref(locale, notice)}`);
  }
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}${accountPageHref(locale, 'linkFailed')}`);
  }
  logActivityEvent({
    userId: data.session.user.id,
    action: 'link_identity',
    metadata: { provider: LINK_RETURN_GOOGLE },
  });
  return NextResponse.redirect(`${origin}${accountPageHref(locale, 'linkedGoogle')}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const locale = await getLocaleFromRequest();
  const defaultNext = `/${locale}/mypage`;
  const safeNext = resolveReturnPath(searchParams.get('next')) ?? defaultNext;

  const supabase = await createClient();

  if (searchParams.get(LINK_RETURN_PARAM) === LINK_RETURN_GOOGLE) {
    return handleLinkReturn(supabase, searchParams, locale, origin);
  }

  // Handle signup email confirmation (PKCE flow)
  if (tokenHash && type === 'signup') {
    const { error, data } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'signup',
    });

    if (!error && data.session) {
      return handleSuccessfulAuth(data.session.user.id, locale, origin, safeNext);
    }

    return NextResponse.redirect(`${origin}/${locale}/sign-in?error=auth_callback_error`);
  }

  // Handle password recovery
  if (tokenHash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });

    if (!error) {
      return NextResponse.redirect(`${origin}/${locale}/reset-password`);
    }

    return NextResponse.redirect(`${origin}/${locale}/sign-in?error=auth_callback_error`);
  }

  if (tokenHash && type === 'email_change') {
    return handleEmailChangeOtp(supabase, tokenHash, locale, origin);
  }

  // Handle OAuth / PKCE code exchange
  if (code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // PKCE recovery flow: redirectTo included ?type=recovery
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/${locale}/reset-password`);
      }

      return handleSuccessfulAuth(data.session.user.id, locale, origin, safeNext);
    }
  }

  // Redirect to sign-in page with error indicator
  return NextResponse.redirect(`${origin}/${locale}/sign-in?error=auth_callback_error`);
}
