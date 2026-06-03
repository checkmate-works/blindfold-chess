'use client';

import { useState } from 'react';

import { AuthField, AuthSubmitButton } from '@/app/_components/AuthFormFields';
import { AuthFormLayout } from '@/app/_components/AuthFormLayout';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useAuthSubmit } from '@/app/[locale]/(public)/_hooks/use-auth-submit';

import { forgotPassword } from '../_actions/forgotPassword';

export function ForgotPasswordForm() {
  const t = useTranslations('forgotPassword');
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);

  const { error, isLoading, handleSubmit } = useAuthSubmit({
    action: () => forgotPassword(email),
    resolveError: (e) => (e === 'rateLimited' ? t('rateLimited') : t('error')),
    onSuccess: () => setIsSent(true),
  });

  if (isSent) {
    return (
      <div className="w-full max-w-sm mx-auto text-center space-y-3">
        <p className="text-foreground">{t('sentDescription')}</p>
        <p className="text-sm text-muted-foreground">{t('checkInbox')}</p>
      </div>
    );
  }

  return (
    <AuthFormLayout onSubmit={handleSubmit} error={error}>
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
    </AuthFormLayout>
  );
}
