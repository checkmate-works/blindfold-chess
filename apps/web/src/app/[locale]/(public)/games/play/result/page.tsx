import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './_components/ResultClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'play' });

  const title = t('resultTitle');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/play/result', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function ResultPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'play' });
  const tMetadata = await getTranslations({ locale, namespace: 'metadata' });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('title')}</PageTitle>
      </div>
      <Suspense>
        <ResultClient locale={locale} brandName={tMetadata('siteName')} />
      </Suspense>
    </>
  );
}
