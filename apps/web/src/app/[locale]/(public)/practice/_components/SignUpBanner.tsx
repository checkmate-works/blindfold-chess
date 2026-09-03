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

/**
 * Client-gated guest banner for the bespoke result screens (knight tour,
 * position memory, puzzle) that render outside `createPracticeResultClient`.
 * Renders nothing until the client auth round-trip resolves, so the banner
 * pops in after first paint. The factory-built result pages no longer use
 * this: they receive `GuestSignUpBanner` from the page Server Component,
 * which already knows the user — see the auth-slot TSDoc in
 * `createPracticeResultPage`. Move a caller onto that path rather than
 * adding a placeholder here.
 */
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
