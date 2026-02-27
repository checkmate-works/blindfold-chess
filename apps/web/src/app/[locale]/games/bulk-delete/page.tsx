import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BulkDeleteClient } from './_components/BulkDeleteClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/bulk-delete' }),
    title: t('bulkDelete.title'),
  };
}

export default async function BulkDeletePage({ params }: Props) {
  const { locale } = await params;

  return <BulkDeleteClient locale={locale} />;
}
