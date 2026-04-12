'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { TextInput } from '@/app/_components';
import {
  AUTH_FORM_LABEL_CLASSES,
  AUTH_SUBMIT_BUTTON_CLASSES,
} from '@/app/_components/authFormStyles';
import { MIN_PASSWORD_LENGTH } from '@/config';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import {
  getPasswordValidationError,
  isPasswordValidationErrorKey,
} from '@/lib/validations/password';

import { FormErrorMessage } from '@/app/[locale]/_components/FormErrorMessage';

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
        const serverError = result.error;
        if (serverError.startsWith('password:')) {
          const key = serverError.slice('password:'.length);
          if (isPasswordValidationErrorKey(key)) {
            setError(tPassword(key, { minLength: MIN_PASSWORD_LENGTH }));
          } else {
            setError(t('emailSignUpError'));
          }
        } else {
          switch (serverError) {
            case 'rateLimited':
              setError(t('rateLimited'));
              break;
            default:
              setError(t('emailSignUpError'));
          }
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
      {error && <FormErrorMessage message={error} />}

      <div>
        <label htmlFor="email" className={AUTH_FORM_LABEL_CLASSES}>
          {t('emailLabel')}
        </label>
        <TextInput
          id="email"
          type="email"
          inputSize="sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="password" className={AUTH_FORM_LABEL_CLASSES}>
          {t('passwordLabel')}
        </label>
        <TextInput
          id="password"
          type="password"
          inputSize="sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder={t('passwordPlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className={AUTH_FORM_LABEL_CLASSES}>
          {t('confirmPasswordLabel')}
        </label>
        <TextInput
          id="confirmPassword"
          type="password"
          inputSize="sm"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder={t('confirmPasswordPlaceholder')}
        />
      </div>

      <button type="submit" disabled={isLoading} className={AUTH_SUBMIT_BUTTON_CLASSES}>
        {isLoading ? t('emailSignUpLoading') : t('emailSignUp')}
      </button>
    </form>
  );
}
