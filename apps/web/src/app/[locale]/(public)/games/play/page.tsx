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
 *    or proceed to recall (game review)
 */
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';
import type { ExpInfo } from '@blindfold-chess/features/exp';

import { getExpInfoBySource } from '@/lib/db/get-exp-info-by-source';
import { AI_GAME_RESULT_SOURCE } from '@/lib/db/save-exp';
import { readBoardVisibilityFromCookies } from '@/lib/games/board-visibility-cookie.server';
import { readMoveInputPreferenceFromCookies } from '@/lib/games/move-input-cookie.server';
import { createClient } from '@/lib/supabase/server';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';
import { BreadcrumbContent } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { MoveInputSkeleton } from './_components/MoveInputSkeleton';
import { MovesPanelSkeleton } from './_components/MovesPanelSkeleton';
import { PlayPageClient } from './_components/PlayPageClient';
import {
  ActionRowSkeleton,
  AlwaysVisibleBoardSkeleton,
  CompactBoardSkeleton,
  IconButtonSkeleton,
  TextLinkSkeleton,
} from './_components/skeletons';
import { deriveMoveInputSkeletonProps } from './_lib';

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

async function PlayContent({ params, searchParams }: Props) {
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

  // Resolve any already-granted AI-game Exp server-side from ?gameId=<id> (the
  // grant's source_id), mirroring the result page, so the earned Exp also shows
  // in the finished-game review. Scoped to `?finished=1` (the only mode that
  // displays it) so active gameplay pays no auth / DB cost. The grant itself
  // stays a result-screen responsibility — here we only display what was
  // already awarded, so a game not yet granted simply shows nothing.
  const sp = await searchParams;
  const isFinishedView = sp.finished === '1';
  let isAuthenticated = false;
  let expInfo: ExpInfo | null = null;
  if (isFinishedView) {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    isAuthenticated = Boolean(user);
    const gameId = typeof sp.gameId === 'string' ? sp.gameId : undefined;
    if (user && gameId) {
      expInfo = await getExpInfoBySource(user.id, AI_GAME_RESULT_SOURCE, gameId);
    }
  }

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
        isAuthenticated={isAuthenticated}
        expInfo={expInfo}
      />
    </Suspense>
  );
}

/**
 * Shown while `PlayContent` resolves. Mirrors the outer structure of
 * PlayPageClient (space-y-8 > PageTitle > PagePanel) and approximates the
 * initial game-in-progress layout (3-column grid with game area and moves
 * panel) to prevent CLS.
 *
 * The move-input column uses `MoveInputSkeleton` with shape driven by
 * `bfc_move_input_pref` so returning users with `moveInputMode` of `text` /
 * `select` or multiple enabled modes get the correctly sized skeleton
 * during this transitional paint. First-time visitors (no cookie) fall back
 * to the `DEFAULT_MOVE_INPUT_HINT` (button, single enabled mode) via the
 * cookie reader.
 *
 * The board skeleton shape is driven by `bfc_board_visibility_pref`:
 * 'never' (pure blindfold) renders no board, just a compact bar, so we
 * reserve `CompactBoardSkeleton`; 'always' / 'peek' reserve the full-size
 * board card (`AlwaysVisibleBoardSkeleton`). This keeps the
 * loading→hydration handoff CLS-free for 'never'-mode users (whose real
 * layout is ~64px, not ~576px).
 */
async function PlaySkeleton() {
  const locale = await getLocaleFromPathnameHeader();
  const [moveInputHint, boardVisibility, tPlay] = await Promise.all([
    readMoveInputPreferenceFromCookies(),
    readBoardVisibilityFromCookies(),
    getTranslations({ locale, namespace: 'play' }),
  ]);
  const moveInputSkeletonProps = deriveMoveInputSkeletonProps(moveInputHint);

  return (
    <div className="space-y-8">
      {/* Match the initial PlayPageClient render (`isInitializing` branch),
          which shows `t('loading')` rather than `t('title')`. Using
          `t('title')` here causes a visible double-flash:
          "Play Chess" → "Loading..." → "Play Chess". The spacer + empty help
          slot mirror PlayPageClient's title row so the centered title doesn't
          shift when the real "?" help button mounts. */}
      <div className="flex items-center justify-center gap-2">
        <div className="w-6 shrink-0" aria-hidden />
        <PageTitle className="min-w-0">{tPlay('loading')}</PageTitle>
        <div className="w-6 shrink-0" aria-hidden />
      </div>

      <PagePanel>
        {/* `-mt-4 sm:mt-0` matches PlayClient: cancel the mobile top padding so
            the full-bleed board skeleton reaches the top edge (no odd gap). */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-4 sm:mt-0">
          {/* Game area skeleton (2 cols). The move-input slot is driven by
              `bfc_move_input_pref` so returning users get the correct input
              shape from this transitional paint onward; the board is always a
              full-size card. */}
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-6">
              {boardVisibility === 'never' ? (
                <CompactBoardSkeleton />
              ) : (
                <AlwaysVisibleBoardSkeleton />
              )}
              <MoveInputSkeleton
                mode={moveInputSkeletonProps.mode}
                hasModeSwitch={moveInputSkeletonProps.hasModeSwitch}
              />
              <ActionRowSkeleton />
              <TextLinkSkeleton />
              <IconButtonSkeleton />
            </div>
          </div>

          {/* Moves panel skeleton (1 col) */}
          <div className="lg:col-span-1">
            <MovesPanelSkeleton />
          </div>
        </div>

        {/* Divider skeleton */}
        <div className="border-t border-border my-6" />

        {/* Breadcrumb skeleton. Matches the real Breadcrumb's `<nav>` wrapper
            (mb-4 flex min-h-10 items-end) so that the handoff from the
            skeleton to the hydrated Breadcrumb is CLS-free across all
            locales, including long-label cases that wrap to 2 lines. */}
        <div className="mb-4 flex min-h-10 w-48 items-end">
          <div className="h-4 w-full rounded bg-muted motion-safe:animate-pulse" />
        </div>
      </PagePanel>
    </div>
  );
}

/**
 * Deliberately NOT a segment-level `loading.tsx`. A `loading.tsx` file here
 * would wrap this whole subtree (including `/games/play/result`) in a
 * `<Suspense>` boundary, so navigating straight into the result page (e.g.
 * from `RecallSummary` or `games/shared/new/page.tsx`) would flash this
 * in-game board skeleton before the result page's own skeleton mounted.
 * Scoping the boundary inside this page's own JSX means it only exists in
 * the render tree when this exact route is the matched leaf.
 */
export default function PlayPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PlaySkeleton />}>
      <PlayContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
