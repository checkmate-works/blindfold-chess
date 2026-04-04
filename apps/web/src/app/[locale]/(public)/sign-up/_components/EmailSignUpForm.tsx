'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

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
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          {t('emailLabel')}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder={t('emailPlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
          {t('passwordLabel')}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder={t('passwordPlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
          {t('confirmPasswordLabel')}
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder={t('confirmPasswordPlaceholder')}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? t('emailSignUpLoading') : t('emailSignUp')}
      </button>
    </form>
  );
}
