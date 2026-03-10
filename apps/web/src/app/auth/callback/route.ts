import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { logActivityEvent } from '@/lib/activity-log';
import { db, profiles } from '@/lib/db';
import { getLocaleFromRequest } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth callback handler.
 *
 * Note: The login session is established here (via exchangeCodeForSession)
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
  const locale = await getLocaleFromRequest();
  const defaultNext = `/${locale}/mypage`;
  const next = searchParams.get('next') ?? defaultNext;
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : defaultNext;

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
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
