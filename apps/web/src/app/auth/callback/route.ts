import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { logActivityEvent } from '@/lib/activity-log';
import { db, profiles } from '@/lib/db';
import { getLocaleFromRequest } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';

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
      const userId = data.session.user.id;

      logActivityEvent({
        userId,
        action: 'login',
      });

      const [profile] = await db
        .select({ username: profiles.username })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);

      if (!profile) {
        const setupUrl = new URL(`/${locale}/mypage/setup-username`, origin);
        return NextResponse.redirect(setupUrl);
      }

      const redirectUrl = new URL(safeNext, origin);
      redirectUrl.searchParams.set('toast', 'login_success');
      return NextResponse.redirect(redirectUrl);
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

      const userId = data.session.user.id;

      logActivityEvent({
        userId,
        action: 'login',
      });

      const [profile] = await db
        .select({ username: profiles.username })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);

      if (!profile) {
        const setupUrl = new URL(`/${locale}/mypage/setup-username`, origin);
        return NextResponse.redirect(setupUrl);
      }

      const redirectUrl = new URL(safeNext, origin);
      redirectUrl.searchParams.set('toast', 'login_success');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect to sign-in page with error indicator
  return NextResponse.redirect(`${origin}/${locale}/sign-in?error=auth_callback_error`);
}
