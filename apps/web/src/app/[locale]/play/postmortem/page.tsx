/**
 * Postmortem Page (感想戦)
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
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PostmortemPageClient } from './_components/PostmortemPageClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'play/postmortem' }),
    title: t('postmortem.title'),
  };
}

export default async function PostmortemPage({ params }: Props) {
  const { locale } = await params;

  return (
    <Suspense>
      <PostmortemPageClient locale={locale} />
    </Suspense>
  );
}
