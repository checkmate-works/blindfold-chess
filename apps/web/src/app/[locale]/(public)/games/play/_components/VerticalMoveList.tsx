'use client';

import type { ReactNode } from 'react';

import type { FormattedPgnMove } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';

type Props = {
  formattedPgn: FormattedPgnMove[];
  /** -1 = before any move; 0..n-1 = the ply that square is showing. */
  currentPosition: number;
  onNavigateToPosition: (position: number) => void;
  /**
   * Rendered inside a move's cell, after the SAN — games/play uses it for the
   * per-move operation-log icon and its popover. The cell becomes a flex row
   * only for the moves this returns something for, so a list without
   * adornments keeps the plain single-element cell.
   */
  adornment?: (moveIndex: number) => ReactNode;
  /** Per-surface extras on the scrolling body — `max-h-[70vh]`, padding. */
  className?: string;
};

/**
 * The numbered two-column move list that sits in a panel: one row per move
 * pair, click a move to send the board to that position.
 *
 * The vertical counterpart to `HorizontalMoveList`, and consolidated for the
 * same reason. Its markup had been pasted verbatim into games/play's
 * `MovesPanel` and recall's `RecallMovesPanel` — down to the `w-10 text-right`
 * number column and the `dark:bg-foreground/10` highlight — so the two could
 * only stay identical by accident, and a third surface (the learn article's
 * sample game) started life as a fifth dialect of the same list: a
 * `bg-secondary` code block with its own paddings and no highlight state at
 * all. Owning the row geometry here is what makes "the score looks the same
 * everywhere" true by construction rather than by review.
 *
 * `font-mono` is deliberately NOT set here: it belongs to the panel body the
 * caller owns (every current caller sets it on the scroll container), and a
 * caller that wants proportional digits should not have to undo it.
 */
export function VerticalMoveList({
  formattedPgn,
  currentPosition,
  onNavigateToPosition,
  adornment,
  className = '',
}: Props) {
  if (formattedPgn.length === 0) return null;

  return (
    <div className={`space-y-0.5 ${className}`}>
      {formattedPgn.map((move) => {
        const whiteIndex = move.whiteMoveIndex;
        const blackIndex = move.blackMoveIndex;
        const isWhiteHighlighted = whiteIndex !== undefined && currentPosition === whiteIndex;
        const isBlackHighlighted = blackIndex !== undefined && currentPosition === blackIndex;
        const whiteAdornment = whiteIndex !== undefined ? adornment?.(whiteIndex) : undefined;
        const blackAdornment = blackIndex !== undefined ? adornment?.(blackIndex) : undefined;

        return (
          <div key={move.moveNumber} className="flex items-center text-sm">
            <span className="w-10 shrink-0 text-right pr-2 text-muted-foreground">
              {move.moveNumber}.
            </span>

            <MoveCell
              san={move.whiteMove}
              // A pair whose white move is missing is a line that starts on
              // Black's turn; the ellipsis is the notation for it, not an
              // empty cell.
              placeholder="..."
              isHighlighted={isWhiteHighlighted}
              onClick={() => whiteIndex !== undefined && onNavigateToPosition(whiteIndex)}
              adornment={whiteAdornment}
            />
            <MoveCell
              san={move.blackMove}
              placeholder=""
              isHighlighted={isBlackHighlighted}
              onClick={() => blackIndex !== undefined && onNavigateToPosition(blackIndex)}
              adornment={blackAdornment}
            />
          </div>
        );
      })}
    </div>
  );
}

function MoveCell({
  san,
  placeholder,
  isHighlighted,
  onClick,
  adornment,
}: {
  san: string | undefined;
  placeholder: string;
  isHighlighted: boolean;
  onClick: () => void;
  adornment: ReactNode;
}) {
  if (!san) {
    return <span className="flex-1 px-2 py-0.5 text-muted-foreground">{placeholder}</span>;
  }

  const move = (
    <button
      type="button"
      className={`flex-1 px-2 py-0.5 rounded text-left cursor-pointer transition-colors ${
        isHighlighted ? 'bg-foreground/15 font-semibold dark:bg-foreground/10' : 'hover:bg-muted/40'
      }`}
      onClick={onClick}
    >
      {san}
    </button>
  );

  // `relative` anchors the adornment's popover to the cell.
  return adornment ? (
    <span className="flex-1 flex items-center relative">
      {move}
      {adornment}
    </span>
  ) : (
    move
  );
}
