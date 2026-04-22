'use client';

import { useState } from 'react';

import { TextInput } from '@/app/_components';
import {
  AUTH_FORM_LABEL_CLASSES,
  AUTH_SUBMIT_BUTTON_CLASSES,
} from '@/app/_components/authFormStyles';
import { Link } from '@/i18n/routing';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { FormErrorMessage } from '@/app/[locale]/_components/FormErrorMessage';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { signIn } from '../_actions/signIn';

export function EmailPasswordForm() {
  const t = useTranslations('signIn');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn(email, password);

      if ('error' in result) {
        switch (result.error) {
          case 'rateLimited':
            setError(t('rateLimited'));
            break;
          default:
            setError(t('emailSignInError'));
        }
        setIsLoading(false);
        return;
      }

      // Use hard navigation to ensure the server-side auth state is fully
      // synchronised. A soft navigation (router.push) can render the
      // destination's Server Components before the browser has committed the
      // session cookies set by the signIn Server Action, resulting in an
      // unauthenticated request and blank page content.
      window.location.href = `/${result.locale}/mypage?toast=login_success`;
    } catch {
      setError(t('emailSignInError'));
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
          autoComplete="current-password"
          placeholder={t('passwordPlaceholder')}
        />
      </div>

      <button type="submit" disabled={isLoading} className={AUTH_SUBMIT_BUTTON_CLASSES}>
        {isLoading ? t('emailSignInLoading') : t('emailSignIn')}
      </button>

      <p className="text-center text-sm">
        <Link href="/forgot-password" locale={locale} className={TEXT_LINK_CLASSES}>
          {t('forgotPassword')}
        </Link>
      </p>
    </form>
  );
}
