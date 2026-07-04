/**
 * Recall Page
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
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { RecallPageClient } from './_components/RecallPageClient';

export const generateStaticParams = generateLocaleStaticParams;

/**
 * `RecallPageClient` reads `pgn` / `moves` / `color` / ... via
 * `useSearchParams()` and renders the entire visible page (title, board,
 * move input, moves panel, breadcrumb) — there is no chrome outside its
 * `<Suspense>` below. On a statically-generated route, Next.js can't know
 * those search params at build time, so the cached HTML would contain only
 * the (fallback-less) Suspense boundary's fallback — an actually blank page
 * — until client JS hydrates and re-renders from the real URL. Declaring
 * `force-dynamic` makes every request render server-side with the real
 * search params already known, so the bare `<Suspense>` resolves to real
 * content immediately instead of a placeholder. Same pattern as
 * `games/play/page.tsx` and `games/new/_lib/create-new-game-page.tsx`.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const title = t('recall.title');
  const description = t('recall.description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/recall', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function RecallPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tMetadata = await getTranslations({ locale, namespace: 'metadata' });
  const t = await getTranslations({ locale });
  const tRecall = await getTranslations({ locale, namespace: 'recall' });

  const breadcrumb = (
    <BreadcrumbContent
      items={[{ label: t('navigation.practice'), href: '/practice' }, { label: tRecall('title') }]}
      locale={locale}
      brandName={tMetadata('siteName')}
      density="compact"
    />
  );

  return (
    <Suspense>
      <RecallPageClient breadcrumb={breadcrumb} />
    </Suspense>
  );
}
