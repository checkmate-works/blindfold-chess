'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { FcGoogle } from 'react-icons/fc';

import { createClient } from '@/lib/supabase/client';

export function GoogleSignInButton() {
  const t = useTranslations('signIn');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
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
      onClick={handleSignIn}
      disabled={isLoading}
      className="flex items-center justify-center gap-3 w-full max-w-sm mx-auto px-6 py-3 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FcGoogle className="w-5 h-5" />
      <span className="text-sm font-medium text-foreground">
        {isLoading ? t('signingIn') : t('signInWithGoogle')}
      </span>
    </button>
  );
}
