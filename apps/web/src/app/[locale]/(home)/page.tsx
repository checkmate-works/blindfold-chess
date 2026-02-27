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

import { AdContainer } from '@/app/[locale]/_components/Ad';

import { generateCanonicalMetadata } from '../_lib/metadata';
import type { Locale } from '../_lib/types';
import { GameListClient, LatestPostsList, LatestPostsSkeleton, NewGameButton } from './_components';

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
  const t = await getTranslations({ locale, namespace: 'Common' });
  const tPosts = await getTranslations({ locale, namespace: 'posts' });

  return (
    <div className="space-y-6">
      <JsonLd data={generateWebApplicationSchema(locale)} />
      <div id="new-game-card">
        <NewGameButton locale={locale} />
      </div>

      {/* テスト用広告 */}
      <div className="text-center">
        <AdContainer
          href="https://example.com"
          text={`${t('sponsoredLink')} - ${t('testAd')}`}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        />
      </div>

      <GameListClient locale={locale} />

      <div className="bg-card border border-border rounded-lg p-4 sm:p-6 md:p-8 shadow-sm">
        <ErrorBoundary>
          <Suspense fallback={<LatestPostsSkeleton title={tPosts('pageTitle')} />}>
            <LatestPostsList locale={locale} title={tPosts('pageTitle')} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
