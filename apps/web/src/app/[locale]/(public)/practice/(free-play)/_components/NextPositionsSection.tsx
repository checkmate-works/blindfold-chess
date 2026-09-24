import { Link } from '@/i18n/routing';

import type { NativeThumbView } from '@/lib/ads/ad';
import type { Position } from '@/lib/db/schema';
import { NEXT_POSITION_COUNT } from '@/lib/positions/next-positions';

import { SectionTitle } from '@/app/[locale]/_components';
import { NativeAdThumb } from '@/app/[locale]/_components/NativeAdThumb';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { NextPositionCard } from './NextPositionCard';

type Props = {
  positions: Pick<Position, 'id' | 'fen' | 'title'>[];
  locale: Locale;
  /** Locale-relative detail route the tiles link into, without the id. */
  basePath: string;
  labels: {
    sectionTitle: string;
    /** Omit for a catalog with no side-to-move concept — see `NextPositionCard`. */
    whiteToMove?: string;
    blackToMove?: string;
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
   * The slot's pool, as `resolveNativeThumbCreatives` resolved it. Empty for
   * an ad-free reader and for a slot nobody has written a creative for, which
   * is how the grid goes back to four puzzles with no branch at the call site.
   *
   * The empty pool is the only ad-free path that works here. The
   * `bfc_ads_hidden` CSS rule collapses `NativeAdThumb`'s own wrapper but not
   * the `<li>` this section wraps it in, so a creative passed for an ad-free
   * reader leaves a blank first cell with the fourth puzzle already dropped.
   */
  nativeAdCreatives?: readonly NativeThumbView[];
};

/**
 * Grid of up to four tappable board thumbnails, so a reader can go straight
 * to another position without the detour through the list. Four tiles lay out
 * as one row on desktop and two rows of two on a phone, which keeps the
 * section short enough that whatever follows it stays within reach.
 *
 * Four surfaces render it — the result screen and the detail page of each of
 * the two position catalogs — and the caller supplies what differs: the
 * heading, the route the tiles link into, and the ad pool. A result screen
 * heads it "Next" for someone who has just finished; a detail page heads it
 * "Other", above the comments, for someone who has not started. Each of the
 * four draws from its own pool, because a creative written for a reader at
 * one of those points is not the creative for a reader at another, and
 * attribution is per creative. The ranking behind all four is one function,
 * `loadNextPositions`.
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
export function NextPositionsSection({
  positions,
  locale,
  basePath,
  labels,
  authorLink,
  nativeAdCreatives = [],
}: Props) {
  if (positions.length === 0) return null;

  const [creative] = nativeAdCreatives;
  const visible = creative ? positions.slice(0, NEXT_POSITION_COUNT - 1) : positions;
  const turnLabels =
    labels.whiteToMove && labels.blackToMove
      ? { whiteToMove: labels.whiteToMove, blackToMove: labels.blackToMove }
      : undefined;

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
        {visible.map((position) => (
          <li key={position.id}>
            <NextPositionCard
              id={position.id}
              fen={position.fen}
              title={position.title}
              locale={locale}
              basePath={basePath}
              labels={turnLabels}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
