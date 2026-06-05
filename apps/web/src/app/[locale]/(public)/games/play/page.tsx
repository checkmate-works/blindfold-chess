/**
 * Play Page
 *
 * @description
 * The main blindfold chess game screen where users play against Stockfish AI.
 * The board is hidden by default to train visualization skills. Users input
 * moves in algebraic notation while mentally tracking the position.
 *
 * @flow
 * 1. Game Setup: Configure player color, AI skill level (1-20) on /games/new
 * 2. Active Play: Input moves via text or dropdown, AI responds automatically
 *    - Board visibility toggle for checking position
 *    - Move history with navigation to review positions
 *    - Undo and resign options available
 * 3. Game End: Win/loss/draw result displayed, option to start new game
 *    or proceed to postmortem (game review)
 */
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { readBoardVisibilityFromCookies } from '@/lib/games/board-visibility-cookie.server';
import { readMoveInputPreferenceFromCookies } from '@/lib/games/move-input-cookie.server';

import { BreadcrumbContent } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PlayPageClient } from './_components/PlayPageClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * `/games/play` reads the per-user `bfc_move_input_pref` cookie so the SSR
 * pipeline can emit the correctly shaped `MoveInputSkeleton` for users whose
 * move-input preference differs from the default. That cookie read makes the
 * page dynamic, so `generateStaticParams` is intentionally not exported
 * and `dynamic = 'force-dynamic'` is declared below to make the opt-out
 * explicit (it also satisfies the repo-wide ISR / user-scope guard — see
 * `apps/web/src/lib/isr-user-scope-guard.test.ts`).
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const title = t('play.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/play', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function PlayPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tMetadata = await getTranslations({ locale, namespace: 'metadata' });
  const tGames = await getTranslations({ locale, namespace: 'gamesPage' });
  const tPlay = await getTranslations({ locale, namespace: 'play' });

  // Server-resolved hints for the pre-hydration skeletons. Both readers return
  // defaults on first visit (no cookie yet). `moveInputHint` shapes the
  // move-input skeleton; `boardVisibilityHint` lets the board skeleton reserve
  // the compact bar for 'never' (pure blindfold) instead of a full-size board,
  // avoiding a ~500px collapse on hydration.
  const [moveInputHint, boardVisibilityHint] = await Promise.all([
    readMoveInputPreferenceFromCookies(),
    readBoardVisibilityFromCookies(),
  ]);

  const breadcrumb = (
    <BreadcrumbContent
      items={[{ label: tGames('pageTitle'), href: '/games' }, { label: tPlay('title') }]}
      locale={locale}
      brandName={tMetadata('siteName')}
      density="compact"
    />
  );

  return (
    <Suspense>
      <PlayPageClient
        locale={locale}
        breadcrumb={breadcrumb}
        initialMoveInputHint={moveInputHint}
        initialBoardVisibility={boardVisibilityHint}
      />
    </Suspense>
  );
}
