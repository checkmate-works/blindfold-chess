import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './_components/ResultClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'play' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/play/result' }),
    title: t('resultTitle'),
  };
}

export default async function ResultPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'play' });
  const tMetadata = await getTranslations({ locale, namespace: 'metadata' });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('title')}</PageTitle>
      </div>
      <ResultClient locale={locale} brandName={tMetadata('siteName')} />
    </>
  );
}
