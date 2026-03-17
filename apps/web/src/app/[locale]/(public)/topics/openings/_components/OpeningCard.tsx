import { Link } from '@/i18n/routing';

import type { ChessOpening } from '@/lib/db';

import { MiniBoard } from './MiniBoard';

type Props = {
  opening: ChessOpening;
  displayName: string;
  locale: string;
};

export function OpeningCard({ opening, displayName, locale }: Props) {
  return (
    <Link
      href={`/topics/openings/${opening.slug}`}
      locale={locale}
      className="flex gap-3 p-3 rounded-lg border border-border bg-card hover:border-foreground/20 transition-colors"
    >
      <MiniBoard fen={opening.fen} size={96} />
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-xs text-muted-foreground font-mono">{opening.ecoCode}</span>
        <h3 className="text-sm font-medium text-foreground leading-snug">{displayName}</h3>
        <span className="text-xs text-muted-foreground mt-1 truncate">{opening.pgn}</span>
      </div>
    </Link>
  );
}
