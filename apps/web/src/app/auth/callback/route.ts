import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { ADS_HIDDEN_COOKIE_NAME, adsHiddenCookieOptions } from '@/lib/ads/ads-hidden-cookie';
import { computeAdsHiddenValueForUser } from '@/lib/ads/ads-hidden-cookie-compute';
import { db, profiles } from '@/lib/db';
import { getLocaleFromRequest } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';
import { logActivityEvent } from '@/lib/users/activity-log';

/**
 * Auth callback handler.
 *
 * Handles four types of callbacks:
 * 1. OAuth `code` — exchanges authorization code for session (existing flow)
 * 2. `code` + `type=recovery` — PKCE recovery flow, exchanges code and redirects to password reset
 * 3. `token_hash` + `type=signup` — verifies signup email confirmation OTP (PKCE flow)
 * 4. `token_hash` + `type=recovery` — redirects to password reset page (non-PKCE flow)
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
    // `refreshAdsHiddenCookie()` on `/mypage/subscription` and the Stripe
    // success landing. See `@/lib/ads/ads-hidden-cookie.ts` for the overall
    // no-flash flow.
    computeAdsHiddenValueForUser(userId),
  ]);

  if (!profile) {
    const setupUrl = new URL(`/${locale}/mypage/setup-username`, origin);
    const response = NextResponse.redirect(setupUrl);
    applyAdsHiddenCookie(response, adsHiddenValue);
    return response;
  }

  const redirectUrl = new URL(safeNext, origin);
  redirectUrl.searchParams.set('toast', 'login_success');
  const response = NextResponse.redirect(redirectUrl);
  applyAdsHiddenCookie(response, adsHiddenValue);
  return response;
}

function applyAdsHiddenCookie(response: NextResponse, value: '1' | null): void {
  if (value === '1') {
    response.cookies.set(ADS_HIDDEN_COOKIE_NAME, '1', adsHiddenCookieOptions());
  } else {
    response.cookies.delete(ADS_HIDDEN_COOKIE_NAME);
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const locale = await getLocaleFromRequest();
  const defaultNext = `/${locale}/mypage`;
  const next = searchParams.get('next') ?? defaultNext;
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : defaultNext;

  const supabase = await createClient();

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
