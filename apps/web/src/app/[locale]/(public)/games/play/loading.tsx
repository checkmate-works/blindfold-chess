import { getLocale, getTranslations } from 'next-intl/server';

import { readBoardVisibilityFromCookies } from '@/lib/games/board-visibility-cookie.server';
import { readMoveInputPreferenceFromCookies } from '@/lib/games/move-input-cookie.server';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';

import { MoveInputSkeleton } from './_components/MoveInputSkeleton';
import { MovesPanelSkeleton } from './_components/MovesPanelSkeleton';
import {
  ActionRowSkeleton,
  AlwaysVisibleBoardSkeleton,
  CompactBoardSkeleton,
  IconButtonSkeleton,
  TextLinkSkeleton,
} from './_components/skeletons';
import { deriveMoveInputSkeletonProps } from './_lib';

// `page.tsx` already declares `dynamic = 'force-dynamic'` which would be
// inherited, but this file also reads `cookies()` directly so we opt out of
// static prerendering here explicitly to keep the intent obvious.
export const dynamic = 'force-dynamic';

/**
 * Games / play loading skeleton.
 *
 * Shown while the play page resolves. Mirrors the outer structure of
 * PlayPageClient (space-y-8 > PageTitle > PagePanel) and approximates
 * the initial game-in-progress layout (3-column grid with game area
 * and moves panel) to prevent CLS.
 *
 * The move-input column uses `MoveInputSkeleton` with shape driven by
 * `bfc_move_input_pref` so returning users with `moveInputMode` of
 * `text` / `select` or multiple enabled modes get the correctly sized
 * skeleton during this transitional paint. First-time visitors (no
 * cookie) fall back to the `DEFAULT_MOVE_INPUT_HINT` (button, single
 * enabled mode) via the cookie reader.
 *
 * The board skeleton shape is driven by `bfc_board_visibility_pref`: 'never'
 * (pure blindfold) renders no board, just a compact bar, so we reserve
 * `CompactBoardSkeleton`; 'always' / 'peek' reserve the full-size board card
 * (`AlwaysVisibleBoardSkeleton`). This keeps the loading→hydration handoff
 * CLS-free for 'never'-mode users (whose real layout is ~64px, not ~576px).
 */
export default async function GamesPlayLoading() {
  // `loading.tsx` can't receive `params`, and the bare `getTranslations()`
  // resolves against the locale set by `setRequestLocale` — which hasn't run
  // yet while the page is still suspended, so it falls back to the default
  // locale and renders the title in English on a `ja` page. Resolve the
  // request locale explicitly so the skeleton's static text is localized from
  // the first paint.
  const locale = await getLocale();
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
            (mb-4 flex min-h-10 items-end) so that the handoff from
            loading.tsx to the hydrated Breadcrumb is CLS-free across all
            locales, including long-label cases that wrap to 2 lines. */}
        <div className="mb-4 flex min-h-10 w-48 items-end">
          <div className="h-4 w-full rounded bg-muted motion-safe:animate-pulse" />
        </div>
      </PagePanel>
    </div>
  );
}
