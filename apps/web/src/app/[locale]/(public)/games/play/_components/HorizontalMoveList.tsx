'use client';

import { useEffect, useRef } from 'react';

import type { FormattedPgnMove } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';

type Props = {
  formattedPgn: FormattedPgnMove[];
  currentPosition: number;
  onNavigateToPosition: (position: number) => void;
  /** Per-surface extras on the strip — `bg-card`, a border, extra padding. */
  className?: string;
};

/**
 * The scrolling SAN strip above a board.
 *
 * The strip itself (its padding and the horizontal scroll that keeps it to one
 * line) is part of this component rather than each caller's wrapper `<div>`:
 * seven surfaces pasted the same `overflow-x-auto px-2 py-1.5` alongside the
 * same `length > 0` guard, and the one that did not — the openings board —
 * wrapped over several centred lines instead, pushing the board down the page
 * as the line got longer. Callers pass only what differs via `className`.
 */
export function HorizontalMoveList({
  formattedPgn,
  currentPosition,
  onNavigateToPosition,
  className = '',
}: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // The list is one long scrolling line, so in a game of any length the move
  // the board is showing is usually outside the visible window — on open (a
  // modal starts at the final move) and on every step. Pull it back into view.
  // `block: 'nearest'` keeps this horizontal: the page must not jump.
  // Optional-called because jsdom does not implement scrollIntoView.
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [currentPosition]);

  if (formattedPgn.length === 0) return null;

  return (
    <div className={`overflow-x-auto px-2 py-1.5 ${className}`}>
      <div className="flex items-center gap-1 text-sm whitespace-nowrap">
        {formattedPgn.map((move) => {
          const whiteIndex = move.whiteMoveIndex;
          const blackIndex = move.blackMoveIndex;
          const isWhiteHighlighted = whiteIndex !== undefined && currentPosition === whiteIndex;
          const isBlackHighlighted = blackIndex !== undefined && currentPosition === blackIndex;

          return (
            <div key={move.moveNumber} className="flex items-center gap-0.5">
              <span className="text-muted-foreground text-xs">{move.moveNumber}.</span>
              {move.whiteMove ? (
                <button
                  type="button"
                  ref={isWhiteHighlighted ? activeRef : undefined}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    isWhiteHighlighted ? 'bg-foreground/15 font-semibold' : 'hover:bg-muted/40'
                  }`}
                  onClick={() => whiteIndex !== undefined && onNavigateToPosition(whiteIndex)}
                >
                  {move.whiteMove}
                </button>
              ) : (
                <span className="px-1.5 py-0.5 text-muted-foreground">..</span>
              )}
              {move.blackMove && (
                <button
                  type="button"
                  ref={isBlackHighlighted ? activeRef : undefined}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    isBlackHighlighted ? 'bg-foreground/15 font-semibold' : 'hover:bg-muted/40'
                  }`}
                  onClick={() => blackIndex !== undefined && onNavigateToPosition(blackIndex)}
                >
                  {move.blackMove}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
