import type { ChessOpening } from '@/lib/db';

import { MiniBoard } from './MiniBoard';

type Props = {
  opening: ChessOpening;
  displayName: string;
};

export function OpeningCard({ opening, displayName }: Props) {
  return (
    <div className="flex gap-3 p-3 rounded-lg border border-border bg-card">
      <MiniBoard fen={opening.fen} size={96} />
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-xs text-muted-foreground font-mono">{opening.ecoCode}</span>
        <h3 className="text-sm font-medium text-foreground leading-snug">{displayName}</h3>
        <span className="text-xs text-muted-foreground mt-1 truncate">{opening.pgn}</span>
      </div>
    </div>
  );
}
