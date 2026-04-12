'use client';

import { useState } from 'react';

import { TextInput } from '@/app/_components';
import {
  AUTH_FORM_LABEL_CLASSES,
  AUTH_SUBMIT_BUTTON_CLASSES,
} from '@/app/_components/authFormStyles';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { FormErrorMessage } from '@/app/[locale]/_components/FormErrorMessage';

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
      {error && <FormErrorMessage message={error} />}

      <p className="text-sm text-muted-foreground">{t('description')}</p>

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

      <button type="submit" disabled={isLoading} className={AUTH_SUBMIT_BUTTON_CLASSES}>
        {isLoading ? t('submitLoading') : t('submit')}
      </button>
    </form>
  );
}
