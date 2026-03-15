import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
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
  const t = await getTranslations({ locale, namespace: 'bulkDelete' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/bulk-delete' }),
    title: t('title'),
  };
}

export default async function BulkDeletePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'bulkDelete' });
  const tGamesPage = await getTranslations({ locale, namespace: 'gamesPage' });
  const tGameList = await getTranslations({ locale, namespace: 'home.gameList' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{tGameList('title')}</SectionTitle>
        <BulkDeleteClient />

        <Breadcrumb
          items={[{ label: tGamesPage('pageTitle'), href: '/games' }, { label: t('title') }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
