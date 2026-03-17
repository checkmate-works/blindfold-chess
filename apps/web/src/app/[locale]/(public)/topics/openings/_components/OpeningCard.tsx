'use client';

import { Link } from '@/i18n/routing';

import type { ChessOpening } from '@/lib/db';

import { useInView } from '@/app/[locale]/_hooks/use-in-view';

import { MiniBoard } from './MiniBoard';

type Props = {
  opening: ChessOpening;
  displayName: string;
  locale: string;
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

export function OpeningCard({ opening, displayName, locale }: Props) {
  const { ref, inView } = useInView({ rootMargin: '200px' });

  return (
    <div ref={ref}>
      <Link
        href={`/topics/openings/${opening.slug}`}
        locale={locale}
        className="flex gap-3 p-3 rounded-lg border border-border bg-card hover:border-foreground/20 transition-colors"
      >
        {inView ? <MiniBoard fen={opening.fen} size={BOARD_SIZE} /> : <BoardSkeleton />}
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-xs text-muted-foreground font-mono">{opening.ecoCode}</span>
          <h3 className="text-sm font-medium text-foreground leading-snug">{displayName}</h3>
          <span className="text-xs text-muted-foreground mt-1 truncate">{opening.pgn}</span>
        </div>
      </Link>
    </div>
  );
}
