import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LimitReachedClient } from './_components/LimitReachedClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/limit-reached' }),
    title: t('manageLimit.title'),
  };
}

export default async function ManageLimitPage({ params }: Props) {
  const { locale } = await params;

  return <LimitReachedClient locale={locale} />;
}
