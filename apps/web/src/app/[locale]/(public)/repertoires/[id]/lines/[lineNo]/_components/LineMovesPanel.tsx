'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import { FaChevronDown } from 'react-icons/fa';

type Props = {
  formatted: FormattedPgnMove[];
  /** Highlighted move index (0-based; the focused ply minus one). */
  currentPosition: number;
  /** Jump the board to the position after the clicked move index. */
  onNavigateToPosition: (index: number) => void;
};

/**
 * The game's collapsible "Moves" panel, slimmed for a repertoire line: the same
 * "Moves" header + chevron and the same two-column (white / black) clickable
 * move list with the current move highlighted. The game-only extras (operation
 * log, restart / new-game, copy PGN/FEN, Lichess) are intentionally dropped —
 * a study line has no such actions. Collapsed by default, mirroring the game.
 */
export function LineMovesPanel({ formatted, currentPosition, onNavigateToPosition }: Props) {
  const t = useTranslations('play');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        className={`w-full rounded-t-lg bg-muted/30 px-4 py-3 transition-colors duration-200 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-border/50 ${
          !isOpen ? 'rounded-b-lg' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-foreground">{t('moves')}</span>
          <FaChevronDown
            className={`h-5 w-5 transform text-muted-foreground transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      <div className={`rounded-b-lg ${isOpen ? 'block' : 'hidden'}`}>
        <div className="max-h-[70vh] overflow-y-auto p-4 font-mono">
          <div className="space-y-0.5">
            {formatted.map((move) => {
              const isWhiteHighlighted =
                move.whiteMoveIndex !== undefined && currentPosition === move.whiteMoveIndex;
              const isBlackHighlighted =
                move.blackMoveIndex !== undefined && currentPosition === move.blackMoveIndex;
              return (
                <div key={move.moveNumber} className="flex items-center text-sm">
                  <span className="w-10 pr-2 text-right text-muted-foreground">
                    {move.moveNumber}.
                  </span>
                  <div className="flex flex-1 items-center">
                    {move.whiteMove ? (
                      <span
                        className={`flex-1 cursor-pointer rounded px-2 py-0.5 transition-colors ${
                          isWhiteHighlighted
                            ? 'bg-foreground/15 font-semibold dark:bg-foreground/10'
                            : 'hover:bg-muted/40'
                        }`}
                        onClick={() =>
                          move.whiteMoveIndex !== undefined &&
                          onNavigateToPosition(move.whiteMoveIndex)
                        }
                      >
                        {move.whiteMove}
                      </span>
                    ) : (
                      <span className="flex-1 px-2 py-0.5 text-muted-foreground">...</span>
                    )}
                  </div>
                  <div className="flex flex-1 items-center">
                    <span
                      className={`flex-1 rounded px-2 py-0.5 transition-colors ${
                        isBlackHighlighted
                          ? 'bg-foreground/15 font-semibold dark:bg-foreground/10'
                          : move.blackMove
                            ? 'cursor-pointer hover:bg-muted/40'
                            : 'pointer-events-none'
                      }`}
                      onClick={() =>
                        move.blackMove &&
                        move.blackMoveIndex !== undefined &&
                        onNavigateToPosition(move.blackMoveIndex)
                      }
                    >
                      {move.blackMove || ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
