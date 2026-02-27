import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PlayErrorClient } from './_components/PlayErrorClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'play/error' }),
    title: t('playError.title'),
  };
}

export default async function PlayErrorPage({ params }: Props) {
  const { locale } = await params;

  return (
    <Suspense>
      <PlayErrorClient locale={locale} />
    </Suspense>
  );
}
