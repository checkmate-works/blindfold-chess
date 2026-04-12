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
      if (result.error === 'rateLimited') {
        setError(t('rateLimited'));
      } else if (result.error.startsWith('password:')) {
        const key = result.error.replace('password:', '');
        setError(tPassword(key, { minLength: MIN_PASSWORD_LENGTH }));
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
        {isLoading ? t('submitLoading') : t('submit')}
      </button>
    </form>
  );
}
