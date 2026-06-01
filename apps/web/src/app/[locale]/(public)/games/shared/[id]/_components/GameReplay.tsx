'use client';

import { useMemo, useState } from 'react';

import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { replayMoves } from '@blindfold-chess/features/chess-core';
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaAngleLeft, FaAngleRight } from 'react-icons/fa';

type Props = {
  moves: string[];
  startingFen: string | null;
  playerColor: 'white' | 'black';
};

/**
 * Inline, self-contained replay of a published game: a fully-revealed board the
 * viewer can step through move by move. Positions are derived once from the
 * immutable move list via `replayMoves`; no server round-trips.
 */
export function GameReplay({ moves, startingFen, playerColor }: Props) {
  const t = useTranslations('sharedGames');
  const positions = useMemo(
    () => replayMoves(moves, startingFen ?? undefined),
    [moves, startingFen]
  );
  const lastIndex = positions.length - 1;
  const [index, setIndex] = useState(0);

  const pos = positions[index];
  const currentMove = index > 0 ? moves[index - 1] : null;

  const nav = [
    { key: 'first', icon: FaAngleDoubleLeft, to: 0, disabled: index === 0 },
    { key: 'prev', icon: FaAngleLeft, to: Math.max(0, index - 1), disabled: index === 0 },
    {
      key: 'next',
      icon: FaAngleRight,
      to: Math.min(lastIndex, index + 1),
      disabled: index === lastIndex,
    },
    { key: 'last', icon: FaAngleDoubleRight, to: lastIndex, disabled: index === lastIndex },
  ] as const;

  return (
    <div className="space-y-3">
      <ChessBoard
        fen={pos.fen}
        flipped={playerColor === 'black'}
        playerSide={playerColor}
        lastMove={pos.lastMove ?? null}
        showCoordinates
        rounded
      />

      <div className="flex items-center justify-center gap-2">
        {nav.slice(0, 2).map(({ key, icon: Icon, to, disabled }) => (
          <button
            key={key}
            type="button"
            aria-label={t(`detail.${key}`)}
            disabled={disabled}
            onClick={() => setIndex(to)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}

        <span className="min-w-[5rem] text-center text-sm tabular-nums text-muted-foreground">
          {currentMove ? `${index}. ${currentMove}` : `${index} / ${lastIndex}`}
        </span>

        {nav.slice(2).map(({ key, icon: Icon, to, disabled }) => (
          <button
            key={key}
            type="button"
            aria-label={t(`detail.${key}`)}
            disabled={disabled}
            onClick={() => setIndex(to)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
