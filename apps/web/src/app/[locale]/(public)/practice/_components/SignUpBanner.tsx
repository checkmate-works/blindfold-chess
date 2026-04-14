'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { SignUpBannerUI } from '@/app/[locale]/_components/SignUpBannerUI';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function SignUpBanner({ locale }: Props) {
  const { user, isLoading } = useAuth();
  const t = useTranslations('practice.signUpBanner');

  if (isLoading || user) return null;

  return (
    <SignUpBannerUI
      locale={locale}
      message={t('message')}
      description={t('description')}
      ctaLabel={t('cta')}
    />
  );
}
