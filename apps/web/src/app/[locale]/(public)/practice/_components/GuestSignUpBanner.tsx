import { getTranslations } from 'next-intl/server';

import { SignUpBannerUI } from '@/app/[locale]/_components/SignUpBannerUI';

type Props = {
  locale: string;
};

/**
 * Sign-up banner for the practice result page, shown directly under the
 * score summary to a viewer the page has already established to be a
 * guest. Purely presentational: the auth
 * decision is hoisted into the result page factory, which resolves the user
 * on the server (the result routes are `force-dynamic` and read the user for
 * the EXP card anyway) and mounts either this or `RecordSection`.
 *
 * The sibling `SignUpBanner` in this directory keeps its own `useAuth` gate
 * for the bespoke result screens (knight tour, position memory, puzzle) that
 * do not go through the factory. That gate renders nothing until the client
 * auth round-trip resolves and then inserts the banner, pushing the action
 * buttons down — the layout shift this component exists to avoid. Do not
 * reintroduce a client-side gate here.
 */
export async function GuestSignUpBanner({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'practice.signUpBanner' });

  return (
    <SignUpBannerUI
      locale={locale}
      message={t('message')}
      description={t('description')}
      ctaLabel={t('cta')}
    />
  );
}
