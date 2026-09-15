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
  labels: {
    whiteToMove: string;
    blackToMove: string;
  };
};

/**
 * One tile in the "next puzzle" grid on the result screen: the position as a
 * board thumbnail, the title on one line, and a white/black dot for the side
 * to move. The whole tile is the link.
 *
 * Links to the puzzle's detail page, not straight into the session. The
 * session screen does not render the puzzle's description, and for many
 * puzzles the description carries the task itself ("mate in two"), so a
 * solver who skipped the detail page would be guessing at the goal. This also
 * matches where Try Again and the Daily Puzzle card send people.
 *
 * Prefetch is deferred to pointer intent. The detail route is dynamic, so
 * Next's default viewport prefetch would cost one server render per tile on
 * every result view to serve the single tile that gets tapped.
 */
export function NextPuzzleCard({ id, fen, title, locale, labels }: Props) {
  const blackToMove = isBlackToMoveFromFen(fen);
  const turnLabel = blackToMove ? labels.blackToMove : labels.whiteToMove;

  return (
    <HoverPrefetchLink
      href={`/${locale}/practice/puzzle/${id}`}
      className={`block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md ${FOCUS_RING_CLASSES}`}
    >
      <ThemedBoardThumbnail fen={fen} className="aspect-square w-full bg-muted" />
      <span className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-foreground">
        <span
          role="img"
          aria-label={turnLabel}
          title={turnLabel}
          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-foreground/40 ${
            blackToMove ? 'bg-foreground' : 'bg-background'
          }`}
        />
        <span className="min-w-0 flex-1 truncate">{title}</span>
      </span>
    </HoverPrefetchLink>
  );
}
