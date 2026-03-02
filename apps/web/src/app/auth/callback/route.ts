import { NextResponse } from 'next/server';

import { getLocaleFromRequest } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const locale = await getLocaleFromRequest();
  const defaultNext = `/${locale}/mypage`;
  const next = searchParams.get('next') ?? defaultNext;
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : defaultNext;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const redirectUrl = new URL(safeNext, origin);
      redirectUrl.searchParams.set('toast', 'login_success');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect to sign-in page with error indicator
  return NextResponse.redirect(`${origin}/${locale}/sign-in?error=auth_callback_error`);
}
