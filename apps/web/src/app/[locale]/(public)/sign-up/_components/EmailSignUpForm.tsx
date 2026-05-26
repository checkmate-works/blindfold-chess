'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { AuthField, AuthSubmitButton } from '@/app/_components/AuthFormFields';
import { FormErrorBanner } from '@/app/_components/FormErrorBanner';
import { MIN_PASSWORD_LENGTH } from '@/config';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { getPasswordValidationError, parsePasswordServerError } from '@/lib/validations/password';

import { signUp } from '../_actions/signUp';

export function EmailSignUpForm() {
  const t = useTranslations('signUp');
  const tPassword = useTranslations('validation.password');
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
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

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(tPassword(passwordError, { minLength: MIN_PASSWORD_LENGTH }));
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(email, password);

      if ('error' in result) {
        const passwordErrorKey = parsePasswordServerError(result.error);
        if (passwordErrorKey) {
          setError(tPassword(passwordErrorKey, { minLength: MIN_PASSWORD_LENGTH }));
        } else if (result.error === 'rateLimited') {
          setError(t('rateLimited'));
        } else {
          setError(t('emailSignUpError'));
        }
        setIsLoading(false);
        return;
      }

      router.push(`/${locale}/sign-up/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError(t('emailSignUpError'));
      setIsLoading(false);
    }
  };

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
