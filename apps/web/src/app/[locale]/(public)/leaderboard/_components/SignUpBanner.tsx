import { getTranslations } from 'next-intl/server';

import { SignUpBannerUI } from '@/app/[locale]/_components/SignUpBannerUI';

type Props = {
  locale: string;
};

/**
 * Leaderboard-scoped SignUpBanner. Purely presentational — the auth check
 * has been hoisted to the host page so the page can decide whether to mount
 * this component at all (`{!user && <SignUpBanner ... />}`). This lets the
 * loading skeleton use a paired CSS rule to hide the banner placeholder for
 * logged-in users with zero layout shift.
 *
 * Renders `SignUpBannerUI` directly instead of going through the shared
 * `@/app/[locale]/_components/SignUpBanner.tsx` wrapper, because that
 * wrapper still performs its own `getOptionalUser()` check — an extra,
 * redundant round-trip we do not need here.
 *
 * Still an async server component (fetches translations), but no longer
 * async-for-auth.
 */
export async function SignUpBanner({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'leaderboard.signUpBanner' });

  return (
    <SignUpBannerUI
      locale={locale}
      message={t('message')}
      description={t('description')}
      ctaLabel={t('cta')}
    />
  );
}
