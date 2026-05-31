/**
 * Postmortem Page
 *
 * @description
 * A game review feature where users replay all moves from a completed game
 * from memory. This strengthens move recall and reinforces the mental model
 * of the game. Board display and move-input method can be adjusted mid-review
 * (seeded from the saved game's preferences); those edits are local to the
 * review session and are not persisted.
 *
 * @flow
 * 1. Entry: Navigate from completed game with PGN passed via URL params
 * 2. Replay Phase: Enter each move from memory in order
 *    - Correct move: Advance to next move
 *    - Incorrect move: Shown as error, retry until correct
 *    - "I don't know" button: Reveals the correct move and advances
 *    - Auto-opponent mode: Only enter your own moves
 * 3. Completion: Summary of accuracy, option to review specific positions
 */
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BreadcrumbContent } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PostmortemPageClient } from './_components/PostmortemPageClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{ gameId?: string; [key: string]: string | string[] | undefined }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const title = t('postmortem.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/play/postmortem', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function PostmortemPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { gameId } = await searchParams;
  setRequestLocale(locale);

  const tMetadata = await getTranslations({ locale, namespace: 'metadata' });
  const tGames = await getTranslations({ locale, namespace: 'gamesPage' });
  const tPlay = await getTranslations({ locale, namespace: 'play' });
  const tPostmortem = await getTranslations({ locale, namespace: 'postmortem' });

  const resultHref = gameId ? `/games/play/result?gameId=${gameId}` : '/games/play/result';

  const breadcrumb = (
    <BreadcrumbContent
      items={[
        { label: tGames('pageTitle'), href: '/games' },
        { label: tPlay('resultTitle'), href: resultHref },
        { label: tPostmortem('title') },
      ]}
      locale={locale}
      brandName={tMetadata('siteName')}
      density="compact"
    />
  );

  return (
    <Suspense>
      <PostmortemPageClient breadcrumb={breadcrumb} />
    </Suspense>
  );
}
