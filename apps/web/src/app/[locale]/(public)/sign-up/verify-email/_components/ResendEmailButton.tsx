'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { createClient } from '@/lib/supabase/client';

type Props = {
  email: string;
};

export function ResendEmailButton({ email }: Props) {
  const t = useTranslations('verifyEmail');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    setIsLoading(true);
    setMessage('');

    const supabase = createClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      setMessage(t('resendError'));
    } else {
      setMessage(t('resendSuccess'));
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleResend}
        disabled={isLoading || !email}
        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? t('resendLoading') : t('resendButton')}
      </button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
