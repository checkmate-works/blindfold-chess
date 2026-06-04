'use client';

import { useState } from 'react';

import { AuthField, AuthSubmitButton } from '@/app/_components/AuthFormFields';
import { AuthFormLayout } from '@/app/_components/AuthFormLayout';
import { Link } from '@/i18n/routing';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useAuthSubmit } from '@/app/[locale]/(public)/_hooks/use-auth-submit';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { signIn } from '../_actions/signIn';

export function EmailPasswordForm() {
  const t = useTranslations('signIn');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { error, isLoading, handleSubmit } = useAuthSubmit<{ locale: string }>({
    action: () => signIn(email, password),
    resolveError: (e) => (e === 'rateLimited' ? t('rateLimited') : t('emailSignInError')),
    onSuccess: (result) => {
      // Use hard navigation to ensure the server-side auth state is fully
      // synchronised. A soft navigation (router.push) can render the
      // destination's Server Components before the browser has committed the
      // session cookies set by the signIn Server Action, resulting in an
      // unauthenticated request and blank page content.
      window.location.href = `/${result.locale}/mypage?toast=login_success`;
    },
  });

  return (
    <AuthFormLayout onSubmit={handleSubmit} error={error}>
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
        autoComplete="current-password"
        placeholder={t('passwordPlaceholder')}
      />

      <AuthSubmitButton
        isLoading={isLoading}
        idleLabel={t('emailSignIn')}
        loadingLabel={t('emailSignInLoading')}
      />

      <p className="text-center text-sm">
        <Link href="/forgot-password" locale={locale} className={TEXT_LINK_CLASSES}>
          {t('forgotPassword')}
        </Link>
      </p>
    </AuthFormLayout>
  );
}
