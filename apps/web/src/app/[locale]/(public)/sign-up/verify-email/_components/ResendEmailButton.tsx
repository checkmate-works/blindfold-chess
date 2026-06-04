'use client';

import { useEffect, useState } from 'react';

import { AUTH_SUBMIT_BUTTON_CLASSES } from '@/app/_components/authFormStyles';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { resendEmail } from '../_actions/resendEmail';

type Props = {
  email: string;
};

const COOLDOWN_SECONDS = 60;

export function ResendEmailButton({ email }: Props) {
  const t = useTranslations('verifyEmail');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const result = await resendEmail(email);

      if ('error' in result) {
        switch (result.error) {
          case 'rateLimited':
            setMessage(t('rateLimited'));
            break;
          default:
            setMessage(t('resendError'));
        }
      } else {
        setMessage(t('resendSuccess'));
        setCooldown(COOLDOWN_SECONDS);
      }
    } catch {
      setMessage(t('resendError'));
    }

    setIsLoading(false);
  };

  const isDisabled = isLoading || !email || cooldown > 0;

  return (
    <div className="space-y-2">
      <button onClick={handleResend} disabled={isDisabled} className={AUTH_SUBMIT_BUTTON_CLASSES}>
        {isLoading
          ? t('resendLoading')
          : cooldown > 0
            ? t('resendCooldown', { seconds: cooldown })
            : t('resendButton')}
      </button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
