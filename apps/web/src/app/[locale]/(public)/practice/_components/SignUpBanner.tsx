'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { SignUpBannerUI } from '@/app/[locale]/_components/SignUpBannerUI';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

type Props = {
  // `string`, not `Locale`, to match the underlying `SignUpBannerUI` (and the
  // broader convention, e.g. `CardLink`). This lets client components that
  // derive the locale via `useSafeLocale()` (which returns `string`) pass it
  // straight through without a cast. Existing callers pass a `Locale`, which is
  // assignable to `string`, so this is a safe widening.
  locale: string;
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
