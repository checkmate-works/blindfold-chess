import { getTranslations } from 'next-intl/server';

import { SignUpBanner as SignUpBannerBase } from '@/app/[locale]/_components/SignUpBanner';

type Props = {
  locale: string;
};

export async function SignUpBanner({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'leaderboard.signUpBanner' });

  return (
    <SignUpBannerBase
      locale={locale}
      message={t('message')}
      description={t('description')}
      ctaLabel={t('cta')}
    />
  );
}
