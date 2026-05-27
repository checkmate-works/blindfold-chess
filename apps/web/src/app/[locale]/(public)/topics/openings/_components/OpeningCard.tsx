'use client';

import { Link } from '@/i18n/routing';

import type { ChessOpening } from '@/lib/db';
import { MiniBoard } from '@/lib/positions/ui/MiniBoard';

import { useInView } from '@/app/[locale]/_hooks/use-in-view';

import { isBlackOpening } from '../_lib/openings';

type OpeningData = Pick<ChessOpening, 'slug' | 'fen' | 'ecoCode' | 'pgn'>;

type Props = {
  opening: OpeningData;
  displayName: string;
  locale: string;
  compact?: boolean;
  disableLink?: boolean;
};

const BOARD_SIZE = 96;
const SQUARE_SIZE = BOARD_SIZE / 8;

function BoardSkeleton() {
  return (
    <div
      className="grid grid-cols-8 border border-border rounded-sm overflow-hidden shrink-0 animate-pulse"
      style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
    >
      {Array.from({ length: 64 }, (_, i) => {
        const isLight = (Math.floor(i / 8) + (i % 8)) % 2 === 0;
        return (
          <div
            key={i}
            className={isLight ? 'bg-muted' : 'bg-muted-foreground/30'}
            style={{ width: SQUARE_SIZE, height: SQUARE_SIZE }}
          />
        );
      })}
    </div>
  );
}

export function OpeningCard({ opening, displayName, locale, compact, disableLink }: Props) {
  const { ref, inView } = useInView({ rootMargin: '200px' });

  const cardContent = (
    <>
      {inView ? (
        <MiniBoard fen={opening.fen} size={BOARD_SIZE} flipped={isBlackOpening(opening.fen)} />
      ) : (
        <BoardSkeleton />
      )}
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-xs text-muted-foreground font-mono">{opening.ecoCode}</span>
        <h3 className="text-sm font-medium text-foreground leading-snug">{displayName}</h3>
        <span className="text-xs text-muted-foreground mt-1 truncate">{opening.pgn}</span>
      </div>
    </>
  );

  if (compact) {
    return (
      <Link
        href={`/topics/openings/${opening.slug}`}
        locale={locale}
        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
      >
        <span className="text-xs text-muted-foreground font-mono shrink-0">{opening.ecoCode}</span>
        <span className="text-sm text-foreground truncate">{displayName}</span>
        <span className="text-xs text-muted-foreground truncate ml-auto hidden sm:inline">
          {opening.pgn}
        </span>
      </Link>
    );
  }

  const cardClassName =
    'flex gap-3 p-3 rounded-lg border border-border bg-card transition-colors' +
    (disableLink ? '' : ' hover:border-foreground/20');

  return (
    <div ref={ref}>
      {disableLink ? (
        <div className={cardClassName}>{cardContent}</div>
      ) : (
        <Link href={`/topics/openings/${opening.slug}`} locale={locale} className={cardClassName}>
          {cardContent}
        </Link>
      )}
    </div>
  );
}
