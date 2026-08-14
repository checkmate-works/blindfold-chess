'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { AuthSubmitButton } from '@/app/_components/AuthFormFields';
import { AuthFormLayout } from '@/app/_components/AuthFormLayout';
import { MIN_PASSWORD_LENGTH } from '@/config';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { resolvePasswordSubmitError } from '@/lib/validations/password';

import { NewPasswordFields } from '@/app/[locale]/(public)/_components/NewPasswordFields';
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
    <AuthFormLayout onSubmit={handleSubmit} error={error}>
      <NewPasswordFields
        password={password}
        onPasswordChange={setPassword}
        confirmPassword={confirmPassword}
        onConfirmPasswordChange={setConfirmPassword}
        labels={{
          password: t('passwordLabel'),
          passwordPlaceholder: t('passwordPlaceholder'),
          confirmPassword: t('confirmPasswordLabel'),
          confirmPasswordPlaceholder: t('confirmPasswordPlaceholder'),
        }}
      />

      <AuthSubmitButton
        isLoading={isLoading}
        idleLabel={t('submit')}
        loadingLabel={t('submitLoading')}
      />
    </AuthFormLayout>
  );
}
