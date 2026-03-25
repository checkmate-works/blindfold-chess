import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { shouldShowAds } from '@/lib/ad';

import { AdBanner } from '@/app/[locale]/_components/AdBanner';
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
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory/result' }),
    title: `${t('positionMemory.title')} - ${t('result')}`,
  };
}

export default async function PositionMemoryResultPage(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const showAds = await shouldShowAds();

  return (
    <>
      <Suspense>
        <ResultClient locale={locale} />
      </Suspense>
      {showAds && <AdBanner slot="banner-standard" locale={locale} />}
    </>
  );
}
