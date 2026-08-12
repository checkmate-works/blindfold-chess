'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FcGoogle } from 'react-icons/fc';

import { createClient } from '@/lib/supabase/client';

type Props = {
  namespace: 'signIn' | 'signUp';
  /**
   * Internal path to return to after auth (validated upstream by `resolveReturnPath`).
   * Forwarded to `/auth/callback` so a CTA-gated page can round-trip the user
   * back. Omitted → the callback falls back to its default (mypage).
   */
  next?: string;
};

export function GoogleOAuthButton({ namespace, next }: Props) {
  const t = useTranslations(namespace);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    const supabase = createClient();
    if (!supabase) return;

    const callback = new URL('/auth/callback', window.location.origin);
    if (next) callback.searchParams.set('next', next);

    // Note: Google's consent screen shows "name and profile picture" permission,
    // but this app does not use that data. Supabase Auth (GoTrue) hardcodes
    // `email` and `profile` as default scopes for the Google provider.
    // The client-side `scopes` parameter is additive — it cannot replace defaults.
    // See: https://github.com/supabase/auth/blob/master/internal/api/provider/google.go
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callback.toString(),
      },
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="flex items-center justify-center gap-3 w-full max-w-sm mx-auto px-6 py-3 bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FcGoogle className="w-5 h-5" />
      <span className="text-sm font-medium text-foreground">
        {isLoading ? t('googleOAuthLoading') : t('googleOAuth')}
      </span>
    </button>
  );
}
