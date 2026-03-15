/**
 * Games Page (ゲーム一覧)
 *
 * @description
 * Displays the full list of saved blindfold chess games with sorting
 * and bulk deletion capabilities. Limited to 20 games maximum.
 *
 * @flow
 * - Sort: Change display order by last played or creation date
 * - Game List: View, resume, or delete past games stored in localStorage
 * - Bulk Delete: Navigate to bulk deletion page for mass cleanup
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { NewGameButton } from '@/app/[locale]/(public)/(home)/_components/NewGameButton';
import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GamesPageClient } from './_components';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.games' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'games' }),
    title: t('title'),
    description: t('description'),
    robots: { index: false },
  };
}

export default async function GamesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'gamesPage' });
  const tGameList = await getTranslations({ locale, namespace: 'home.gameList' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{tGameList('title')}</SectionTitle>
        <NewGameButton locale={locale} />
        <GamesPageClient locale={locale} />

        <Divider />
        <Breadcrumb items={[{ label: t('pageTitle'), href: undefined }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
