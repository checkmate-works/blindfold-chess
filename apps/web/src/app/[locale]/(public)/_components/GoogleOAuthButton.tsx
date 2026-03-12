'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { FcGoogle } from 'react-icons/fc';

import { createClient } from '@/lib/supabase/client';

type Props = {
  namespace: 'signIn' | 'signUp';
};

export function GoogleOAuthButton({ namespace }: Props) {
  const t = useTranslations(namespace);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    const supabase = createClient();
    if (!supabase) return;

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="flex items-center justify-center gap-3 w-full max-w-sm mx-auto px-6 py-3 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FcGoogle className="w-5 h-5" />
      <span className="text-sm font-medium text-foreground">
        {isLoading ? t('googleOAuthLoading') : t('googleOAuth')}
      </span>
    </button>
  );
}
