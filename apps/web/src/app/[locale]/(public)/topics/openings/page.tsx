import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  OpeningCategoryFilter,
  OpeningCategorySectionTitle,
  OpeningsListByCategory,
} from './_components';
import { getOpenings } from './_lib/queries';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.topicsOpenings' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'topics/openings' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function OpeningsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'topics' });
  const openings = await getOpenings();

  return (
    <div className="space-y-8">
      <PageTitle>{t('openings.title')}</PageTitle>

      <PagePanel>
        <Suspense>
          <OpeningCategorySectionTitle />
          <OpeningCategoryFilter />
          <OpeningsListByCategory openings={openings} locale={locale} />
        </Suspense>

        <Divider />

        <Breadcrumb
          items={[{ label: t('title'), href: '/topics' }, { label: t('openings.title') }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
