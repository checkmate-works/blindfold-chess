'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { AuthField, AuthSubmitButton } from '@/app/_components/AuthFormFields';
import { FormErrorBanner } from '@/app/_components/FormErrorBanner';
import { MIN_PASSWORD_LENGTH } from '@/config';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { resolvePasswordSubmitError } from '@/lib/validations/password';

import { useAuthSubmit } from '@/app/[locale]/(public)/_hooks/use-auth-submit';

import { resetPassword } from '../_actions/resetPassword';

export function ResetPasswordForm() {
  const t = useTranslations('resetPassword');
  const tPassword = useTranslations('validation.password');
  const locale = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { error, isLoading, handleSubmit } = useAuthSubmit({
    action: () => resetPassword(password),
    validate: () => (password !== confirmPassword ? t('passwordMismatch') : null),
    resolveError: (e) =>
      resolvePasswordSubmitError(e, {
        onPasswordError: (key) => tPassword(key, { minLength: MIN_PASSWORD_LENGTH }),
        onRateLimited: () => t('rateLimited'),
        onOther: () => t('error'),
      }),
    onSuccess: () => {
      router.push(`/${locale}/mypage?toast=password_reset_success`);
    },
  });

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-4">
      {error && <FormErrorBanner message={error} variant="bordered" />}

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
