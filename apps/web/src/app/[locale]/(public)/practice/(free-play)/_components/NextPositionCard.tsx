'use client';

import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import { HoverPrefetchLink } from '@/app/[locale]/_components/HoverPrefetchLink';
import { FOCUS_RING_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  id: string;
  fen: string;
  title: string;
  locale: Locale;
  /** Locale-relative detail route this tile links into, without the id. */
  basePath: string;
  /**
   * Side-to-move labels. Omitted for a catalog where the concept has no
   * meaning on the surface: a puzzle asks for the best move, so whose move it
   * is is half the question, while a memory position asks you to reconstruct
   * the board and nothing on its own page names a side to move. Introducing
   * the dot only in this grid would be introducing the concept.
   */
  labels?: {
    whiteToMove: string;
    blackToMove: string;
  };
};

/**
 * One tile in the "next / other positions" grid: the position as a board
 * thumbnail, the title on one line, and — for puzzles — a white/black dot for
 * the side to move. The whole tile is the link.
 *
 * Links to the position's detail page, not straight into the session. The
 * session screen does not render the description, and for many puzzles the
 * description carries the task itself ("mate in two"), so a solver who
 * skipped the detail page would be guessing at the goal. This also matches
 * where Try Again and the Daily Puzzle card send people.
 *
 * Prefetch is deferred to pointer intent. The detail route is dynamic, so
 * Next's default viewport prefetch would cost one server render per tile on
 * every result view to serve the single tile that gets tapped.
 */
export function NextPositionCard({ id, fen, title, locale, basePath, labels }: Props) {
  const blackToMove = isBlackToMoveFromFen(fen);
  const turnLabel = labels && (blackToMove ? labels.blackToMove : labels.whiteToMove);

  return (
    <HoverPrefetchLink
      href={`/${locale}${basePath}/${id}`}
      className={`block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md ${FOCUS_RING_CLASSES}`}
    >
      <ThemedBoardThumbnail fen={fen} className="aspect-square w-full bg-muted" />
      <span className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-foreground">
        {turnLabel && (
          <span
            role="img"
            aria-label={turnLabel}
            title={turnLabel}
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-foreground/40 ${
              blackToMove ? 'bg-foreground' : 'bg-background'
            }`}
          />
        )}
        <span className="min-w-0 flex-1 truncate">{title}</span>
      </span>
    </HoverPrefetchLink>
  );
}
