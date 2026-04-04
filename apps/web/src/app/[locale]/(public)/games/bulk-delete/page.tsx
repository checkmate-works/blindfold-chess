import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BulkDeleteClient } from './_components/BulkDeleteClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'bulkDelete' });

  const title = t('title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/bulk-delete', title }),
    title,
  };
}

export default async function BulkDeletePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
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
