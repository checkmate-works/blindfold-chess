import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './ResultClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/route-planner/result' }),
    title: `${t('routePlanner.title')} - ${t('result')}`,
  };
}

export default async function RoutePlannerResultPage(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <>
      <Suspense>
        <ResultClient locale={locale} adBanner={<AdBannerGuard slot="banner-wide" />} />
      </Suspense>
      <AdBannerGuard slot="banner-standard" />
    </>
  );
}
