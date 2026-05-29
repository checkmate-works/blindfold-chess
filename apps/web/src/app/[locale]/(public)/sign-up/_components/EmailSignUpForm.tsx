'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { AuthField, AuthSubmitButton } from '@/app/_components/AuthFormFields';
import { FormErrorBanner } from '@/app/_components/FormErrorBanner';
import { MIN_PASSWORD_LENGTH } from '@/config';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { getPasswordValidationError, resolvePasswordSubmitError } from '@/lib/validations/password';

import { useAuthSubmit } from '@/app/[locale]/(public)/_hooks/use-auth-submit';

import { signUp } from '../_actions/signUp';

export function EmailSignUpForm() {
  const t = useTranslations('signUp');
  const tPassword = useTranslations('validation.password');
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { error, isLoading, handleSubmit } = useAuthSubmit({
    action: () => signUp(email, password),
    validate: () => {
      if (password !== confirmPassword) return t('passwordMismatch');
      const passwordError = getPasswordValidationError(password);
      if (passwordError) return tPassword(passwordError, { minLength: MIN_PASSWORD_LENGTH });
      return null;
    },
    resolveError: (e) =>
      resolvePasswordSubmitError(e, {
        onPasswordError: (key) => tPassword(key, { minLength: MIN_PASSWORD_LENGTH }),
        onRateLimited: () => t('rateLimited'),
        onOther: () => t('emailSignUpError'),
      }),
    onSuccess: () => {
      router.push(`/${locale}/sign-up/verify-email?email=${encodeURIComponent(email)}`);
    },
  });

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-4">
      {error && <FormErrorBanner message={error} variant="bordered" />}

      <AuthField
        id="email"
        type="email"
        label={t('emailLabel')}
        value={email}
        onChange={setEmail}
        autoComplete="email"
        placeholder={t('emailPlaceholder')}
      />

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
        idleLabel={t('emailSignUp')}
        loadingLabel={t('emailSignUpLoading')}
      />
    </form>
  );
}
