import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './ResultClient';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/board-symmetry/result' }),
    title: `${t('boardSymmetry.title')} - ${t('result')}`,
  };
}

export default async function BoardSymmetryResultPage(props: Props) {
  const { locale } = await props.params;

  return (
    <>
      <Suspense>
        <ResultClient locale={locale} adBanner={<AdBanner slot="banner-wide" locale={locale} />} />
      </Suspense>
      <AdBanner slot="banner-standard" locale={locale} />
    </>
  );
}
