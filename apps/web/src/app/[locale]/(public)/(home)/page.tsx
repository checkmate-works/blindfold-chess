/**
 * Home Page (ホーム)
 *
 * @description
 * The main landing page for authenticated users. Provides quick access to
 * start new blindfold chess games and manage existing game history.
 *
 * @flow
 * - New Game Button: Navigate to game setup to start a new blindfold chess game
 * - Game List: View, resume, or delete past games stored in localStorage
 *   - Each game item shows: status (win/loss/draw/in-progress), player color,
 *     last move, and skill level
 *   - Trash icon button allows deletion of individual games
 */
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ErrorBoundary } from '@/app/_components/ErrorBoundary';

import { JsonLd, generateWebApplicationSchema } from '@/lib/jsonld';

import { AdBanner, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  GameListClient,
  LatestArticlesList,
  LatestArticlesSkeleton,
  LatestTopicPostsList,
  LatestTopicPostsSkeleton,
  NewGameButton,
} from './_components';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.home' });

  return {
    ...generateCanonicalMetadata({ locale, path: '' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const tHome = await getTranslations({ locale, namespace: 'home' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });
  const tArticles = await getTranslations({ locale, namespace: 'articles' });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{tHome('pageTitle')}</PageTitle>
      </div>

      <div className="space-y-6">
        <JsonLd data={generateWebApplicationSchema(locale)} />

        <ErrorBoundary>
          <Suspense fallback={<LatestTopicPostsSkeleton title={tTopics('recentTopicPosts')} />}>
            <LatestTopicPostsList locale={locale} title={tTopics('recentTopicPosts')} />
          </Suspense>
        </ErrorBoundary>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 md:p-8 shadow-sm space-y-4">
          <SectionTitle>{tHome('gameList.title')}</SectionTitle>

          <NewGameButton locale={locale} />

          <GameListClient locale={locale} />
        </div>

        <AdBanner slot="home-wide" locale={locale} />

        <ErrorBoundary>
          <Suspense fallback={<LatestArticlesSkeleton title={tArticles('pageTitle')} />}>
            <LatestArticlesList locale={locale} title={tArticles('pageTitle')} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}
