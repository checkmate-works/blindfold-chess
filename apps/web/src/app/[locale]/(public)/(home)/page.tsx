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

import { PageTitle } from '@/app/[locale]/_components';
import { Ad } from '@/app/[locale]/_components/Ad';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

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
  const tPosts = await getTranslations({ locale, namespace: 'posts' });

  return (
    <>
      <div className="mb-8">
        <PageTitle>Home</PageTitle>
      </div>

      <div className="space-y-6">
        <JsonLd data={generateWebApplicationSchema(locale)} />
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 md:p-8 shadow-sm space-y-4">
          <div id="new-game-card">
            <NewGameButton locale={locale} />
          </div>

          <GameListClient locale={locale} />
        </div>

        {/* Buy me a Coffee Banner */}
        <div className="flex justify-center w-full py-2">
          <Ad
            href="https://buymeacoffee.com/fujillc"
            text="Buy me a Coffee"
            imageUrl="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=fujillc&button_colour=8bbdf2&font_colour=ffffff&font_family=Cookie&outline_colour=ffffff&coffee_colour=FFDD00"
            imageAlt="Buy me a Coffee"
            className="inline-block transition-opacity hover:opacity-90 grayscale-0 hover:grayscale-0 opacity-90 transition-all duration-300"
          />
        </div>

        <ErrorBoundary>
          <Suspense fallback={<LatestPostsSkeleton title={tPosts('pageTitle')} />}>
            <LatestPostsList locale={locale} title={tPosts('pageTitle')} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}
