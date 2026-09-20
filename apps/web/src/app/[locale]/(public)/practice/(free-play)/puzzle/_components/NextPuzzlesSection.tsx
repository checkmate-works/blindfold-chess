import { Link } from '@/i18n/routing';

import type { NativeThumbView } from '@/lib/ads/ad';
import type { Position } from '@/lib/db/schema';
import { NEXT_PUZZLE_COUNT } from '@/lib/positions/next-puzzles';

import { SectionTitle } from '@/app/[locale]/_components';
import { NativeAdThumb } from '@/app/[locale]/_components/NativeAdThumb';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { NextPuzzleCard } from './NextPuzzleCard';

type Props = {
  puzzles: Pick<Position, 'id' | 'fen' | 'title'>[];
  locale: Locale;
  labels: {
    sectionTitle: string;
    whiteToMove: string;
    blackToMove: string;
  };
  /**
   * The same-author list link that used to stand alone under the attribution
   * row. Rendered as the section's header action so the cards (author-first)
   * and the "see all" destination read as one unit. Omitted for puzzles
   * whose author has no public profile.
   */
  authorLink?: {
    href: string;
    label: string;
  };
  /**
   * The slot's pool, as `getNativeThumbCreatives` resolved it. Empty for an
   * ad-free reader and for a slot nobody has written a creative for, which is
   * how the grid goes back to four puzzles with no branch at the call site.
   */
  nativeAdCreatives?: readonly NativeThumbView[];
};

/**
 * Grid of up to four tappable board thumbnails, so a reader can go straight
 * to another puzzle without the detour through the list. Four tiles lay out
 * as one row on desktop and two rows of two on a phone, which keeps the
 * section short enough that whatever follows it stays within reach.
 *
 * Two surfaces render it, and the caller supplies what differs. The result
 * screen heads it "Next puzzles" for someone who has just solved one; a
 * puzzle's own page heads it "Other puzzles", above the comments, for someone
 * who has not started. They draw from different ad pools for that same reason
 * (`PUZZLE_RESULT_NATIVE_AD_SLOT` / `PUZZLE_DETAIL_NATIVE_AD_SLOT`). The
 * ranking behind both is one function, `loadNextPuzzles`.
 *
 * A native ad takes the first cell when there is one to show, and the grid
 * stays four cells wide — the fourth puzzle drops off rather than the section
 * growing a fifth cell, which at both breakpoints would sit alone on a second
 * row and push the action buttons down. Leading rather than trailing is the
 * rule every list on the site follows (`AD_INTERVAL` in
 * `@/lib/ads/placement`), and it matters most here: a trailing cell is the
 * one a solver scrolls past on the way to Try Again.
 *
 * Renders nothing when there are no candidates, so the heading never sits
 * over an empty grid — an ad alone is not a "next puzzle" section.
 */
export function NextPuzzlesSection({
  puzzles,
  locale,
  labels,
  authorLink,
  nativeAdCreatives = [],
}: Props) {
  if (puzzles.length === 0) return null;

  const [creative] = nativeAdCreatives;
  const visiblePuzzles = creative ? puzzles.slice(0, NEXT_PUZZLE_COUNT - 1) : puzzles;

  return (
    <section className="space-y-3">
      <SectionTitle>
        <span className="flex items-baseline justify-between gap-3">
          <span>{labels.sectionTitle}</span>
          {authorLink && (
            <Link
              href={authorLink.href}
              locale={locale}
              className={`shrink-0 text-sm font-normal ${TEXT_LINK_MUTED_CLASSES}`}
            >
              {authorLink.label}
            </Link>
          )}
        </span>
      </SectionTitle>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {creative && (
          <li key={creative.id}>
            <NativeAdThumb creative={creative} className="h-full" />
          </li>
        )}
        {visiblePuzzles.map((puzzle) => (
          <li key={puzzle.id}>
            <NextPuzzleCard
              id={puzzle.id}
              fen={puzzle.fen}
              title={puzzle.title}
              locale={locale}
              labels={labels}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
