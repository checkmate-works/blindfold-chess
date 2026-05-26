'use client';

import { useState } from 'react';

import { AuthField, AuthSubmitButton } from '@/app/_components/AuthFormFields';
import { FormErrorBanner } from '@/app/_components/FormErrorBanner';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { forgotPassword } from '../_actions/forgotPassword';

export function ForgotPasswordForm() {
  const t = useTranslations('forgotPassword');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await forgotPassword(email);

      if ('error' in result) {
        switch (result.error) {
          case 'rateLimited':
            setError(t('rateLimited'));
            break;
          default:
            setError(t('error'));
        }
        setIsLoading(false);
        return;
      }

      setIsSent(true);
      setIsLoading(false);
    } catch {
      setError(t('error'));
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="w-full max-w-sm mx-auto text-center space-y-3">
        <p className="text-foreground">{t('sentDescription')}</p>
        <p className="text-sm text-muted-foreground">{t('checkInbox')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-4">
      {error && <FormErrorBanner message={error} variant="bordered" />}

      <p className="text-sm text-muted-foreground">{t('description')}</p>

      <AuthField
        id="email"
        type="email"
        label={t('emailLabel')}
        value={email}
        onChange={setEmail}
        autoComplete="email"
        placeholder={t('emailPlaceholder')}
      />

      <AuthSubmitButton
        isLoading={isLoading}
        idleLabel={t('submit')}
        loadingLabel={t('submitLoading')}
      />
    </form>
  );
}
