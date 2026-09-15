import { getTranslations } from 'next-intl/server';

import { BoardFrame, BoardSkeleton } from '@/app/_components';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { getOptionalUser } from '@/lib/auth';
import { NEXT_PUZZLE_COUNT } from '@/lib/positions/next-puzzles';

import {
  ExpGainSkeleton,
  SignUpBannerSkeleton,
} from '@/app/[locale]/(public)/practice/_components/skeletons';
import { SectionTitle } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Inner-content skeleton for the puzzle result, shaped like the part of
 * `PuzzleResultClient` that renders inside `<PagePanel>` (before the divider /
 * breadcrumb): the solution-replay section title, the board, the solution line,
 * the EXP gain card / sign-up banner, and the three action buttons.
 *
 * The puzzle result page renders its chrome (PageTitle / PagePanel / Breadcrumb
 * via `PageLayout`) on the server, OUTSIDE the client component — so unlike the
 * other result pages it never flashes to bare background. But `PuzzleResultClient`
 * is still a client component whose chunk can lag on a soft navigation; without
 * an inner `<Suspense>` fallback the panel body would briefly empty (or bubble
 * up and re-show the whole route `loading.tsx`). This fills just the body.
 *
 * Shared with the route `loading.tsx` (`PuzzleResultLoading`), which wraps this
 * in the PageTitle + PagePanel + breadcrumb chrome, so the loading state and the
 * chunk-load fallback are one shape.
 *
 * `ExpGainDisplay` (authenticated) and `SignUpBanner` (anonymous) occupy the
 * same slot above the buttons and are mutually exclusive by auth state, so the
 * user is resolved here and exactly one full-height placeholder is reserved —
 * matching the real card/banner rather than a thin bar.
 *
 * The next-puzzle grid is always reserved. It only disappears when the whole
 * catalog has no other puzzle, so reserving it is right in every realistic
 * case, and without it the action buttons would jump down on hydrate.
 */
export async function PuzzleResultContentSkeleton() {
  const locale = await getLocaleFromPathnameHeader();
  const [t, user] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.puzzle' }),
    getOptionalUser(),
  ]);
  const isAuthed = !!user;

  return (
    <div className="space-y-6">
      {/* PuzzleSolutionReplay: section title + board + solution line */}
      <div className="space-y-6">
        <SectionTitle>{t('result.replaySection')}</SectionTitle>

        <BoardFrame>
          <BoardSkeleton />
        </BoardFrame>

        {/* Solution text — single-move case is the common one
            (`Solution: <san>`). Multi-move puzzles render a numbered list,
            but a single centered bar tracks the visual weight of either
            shape closely enough that swapping in the real content does
            not jolt the page. */}
        <div className="flex justify-center">
          <Skeleton className="h-4 w-48 rounded" />
        </div>
      </div>

      {/* ExpGainDisplay (authenticated) / SignUpBanner (anonymous) — same slot,
          mutually exclusive. Reserve the matching full-height block so the real
          content does not push the buttons down on hydrate. */}
      {isAuthed ? <ExpGainSkeleton /> : <SignUpBannerSkeleton />}

      {/* NextPuzzlesSection: section title + square tiles (2 columns on phones,
          4 on desktop — same grid as the real component). */}
      <div className="space-y-3">
        <SectionTitle>{t('result.nextPuzzles')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: NEXT_PUZZLE_COUNT }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      </div>

      {/* Action buttons (Try Again / Back to Puzzles / Analyze on Lichess) —
          three full-width buttons, matching the real `flex flex-col gap-3 pt-4`
          block. */}
      <div className="flex flex-col gap-3 pt-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
