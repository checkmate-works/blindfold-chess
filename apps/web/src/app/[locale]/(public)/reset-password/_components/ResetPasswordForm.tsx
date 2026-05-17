'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { AuthField, AuthSubmitButton } from '@/app/_components/AuthFormFields';
import { MIN_PASSWORD_LENGTH } from '@/config';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { parsePasswordServerError } from '@/lib/validations/password';

import { FormErrorMessage } from '@/app/[locale]/_components/FormErrorMessage';

import { resetPassword } from '../_actions/resetPassword';

export function ResetPasswordForm() {
  const t = useTranslations('resetPassword');
  const tPassword = useTranslations('validation.password');
  const locale = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setIsLoading(true);

    const result = await resetPassword(password);

    if ('error' in result) {
      const passwordErrorKey = parsePasswordServerError(result.error);
      if (passwordErrorKey) {
        setError(tPassword(passwordErrorKey, { minLength: MIN_PASSWORD_LENGTH }));
      } else if (result.error === 'rateLimited') {
        setError(t('rateLimited'));
      } else {
        setError(t('error'));
      }
      setIsLoading(false);
      return;
    }

    router.push(`/${locale}/mypage?toast=password_reset_success`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-4">
      {error && <FormErrorMessage message={error} />}

      <AuthField
        id="password"
        type="password"
        label={t('passwordLabel')}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        placeholder={t('passwordPlaceholder')}
      />

      <AuthField
        id="confirmPassword"
        type="password"
        label={t('confirmPasswordLabel')}
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        placeholder={t('confirmPasswordPlaceholder')}
      />

      <AuthSubmitButton
        isLoading={isLoading}
        idleLabel={t('submit')}
        loadingLabel={t('submitLoading')}
      />
    </form>
  );
}
