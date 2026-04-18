/**
 * Postmortem Page
 *
 * @description
 * A game review feature where users replay all moves from a completed game
 * from memory. This strengthens move recall and reinforces the mental model
 * of the game. Optionally provides Stockfish evaluation for each move.
 *
 * @flow
 * 1. Entry: Navigate from completed game with PGN passed via URL params
 * 2. Replay Phase: Enter each move from memory in order
 *    - Correct move: Advance to next move (with optional evaluation)
 *    - Incorrect move: Shown as error, retry until correct
 *    - "I don't know" button: Reveals the correct move and advances
 *    - Auto-opponent mode: Only enter your own moves
 * 3. Completion: Summary of accuracy, option to review specific positions
 */
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PostmortemPageClient } from './_components/PostmortemPageClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
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

export default async function PostmortemPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tMetadata = await getTranslations({ locale, namespace: 'metadata' });

  return (
    <Suspense>
      <PostmortemPageClient locale={locale} brandName={tMetadata('siteName')} />
    </Suspense>
  );
}
