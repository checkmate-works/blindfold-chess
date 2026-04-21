import { readMoveInputPreferenceFromCookies } from '@/lib/games/move-input-cookie.server';
import { readPeekPreferenceFromCookies } from '@/lib/games/peek-cookie.server';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';

import { MoveInputSkeleton } from './_components/MoveInputSkeleton';
import { MovesPanelSkeleton } from './_components/MovesPanelSkeleton';
import {
  ActionRowSkeleton,
  IconButtonSkeleton,
  InlineBoardHeaderSkeleton,
  TextLinkSkeleton,
} from './_components/skeletons';
import {
  deriveMoveInputSkeletonProps,
  shouldShowInlinePeekHeader,
  shouldShowModalPeekButton,
} from './_lib';

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
 * Peek-related reservations (`InlineBoardHeaderSkeleton` and the
 * `ActionRowSkeleton showBoardButton` slot) are driven by
 * `bfc_peek_pref` so inline-peek users and users who disabled the board
 * button get the correct layout during this transitional paint too.
 */
export default async function GamesPlayLoading() {
  const [moveInputHint, peekHint] = await Promise.all([
    readMoveInputPreferenceFromCookies(),
    readPeekPreferenceFromCookies(),
  ]);
  const moveInputSkeletonProps = deriveMoveInputSkeletonProps(moveInputHint);
  const showInlinePeekHeader = shouldShowInlinePeekHeader(peekHint);
  const showModalPeekButton = shouldShowModalPeekButton(peekHint);

  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="invisible">Loading</span>
      </PageTitle>

      <PagePanel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game area skeleton (2 cols).
              Move-input and peek-related slots are driven by the
              `bfc_move_input_pref` / `bfc_peek_pref` cookies so returning
              users get the correct layout from this transitional paint
              onward. */}
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-6">
              {showInlinePeekHeader && <InlineBoardHeaderSkeleton />}
              <MoveInputSkeleton
                mode={moveInputSkeletonProps.mode}
                hasModeSwitch={moveInputSkeletonProps.hasModeSwitch}
              />
              <ActionRowSkeleton showBoardButton={showModalPeekButton} />
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
