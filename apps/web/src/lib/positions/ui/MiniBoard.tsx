'use client';

import { useMemo } from 'react';

import { BoardLayout } from '@/app/_components/chess/BoardLayout';
import type { Color } from '@blindfold-chess/features/chess-core';
import { fenToPlacements } from '@blindfold-chess/features/chess-core/fen';
import { ChessPieceIcon } from '@blindfold-chess/icons';
import type { PieceType } from '@blindfold-chess/types';

import type { MoveSquares } from '@/lib/board/move-squares';
import { getBoardThemeColors } from '@/lib/games/board-themes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

/** FEN placement → square-keyed pieces ("e4" → white pawn). */
function parseFenPlacement(fen: string): Map<string, { type: PieceType; color: Color }> {
  return new Map(fenToPlacements(fen).map(({ square, type, color }) => [square, { type, color }]));
}

type Props = {
  fen: string;
  size?: number;
  responsive?: boolean;
  flipped?: boolean;
  /**
   * Squares to ring as the last move. Pass it already resolved against the
   * `highlightLastMove` preference — `useBoardDisplay` does that.
   */
  lastMove?: MoveSquares | null;
  /**
   * Off by default: the thumbnail sizes this renders at (120px) have no room
   * for legible file/rank labels. Enlarged views pass the viewer's preference.
   */
  showCoordinates?: boolean;
  /**
   * Corner radius utility for the `responsive` wrapper. The default suits a
   * board inside a padded card (an attachment, a feed post); a board that
   * runs to the screen edges on mobile passes
   * `BOARD_RADIUS_EXPAND_ON_MOBILE` so its corners square there.
   */
  rounded?: string;
};

/**
 * Static board for a FEN — thumbnails on cards and feeds, and the enlarged
 * board inside an attachment's review modal.
 *
 * @design Why this exists next to ChessBoard
 *
 * `ChessBoard` imports chess-core (legal-move generation for its interactive
 * mode), and through it chess.js. Attachment cards render on the feed and in
 * every comment thread, so they must not drag that into the first-paint
 * bundle for a picture of a position nobody has clicked yet.
 *
 * What it does NOT do is re-implement the board: squares, coordinates, the
 * last-move ring and the theme colours all come from `BoardLayout` — the same
 * layer `ChessBoard` renders through, which is free of chess-core. So the two
 * boards can only differ in what they are given, not in how they draw it.
 */
export function MiniBoard({
  fen,
  size = 120,
  responsive = false,
  flipped = false,
  lastMove = null,
  showCoordinates = false,
  rounded = 'rounded-sm',
}: Props) {
  const { preferences } = useGamePreferences();
  const pieces = useMemo(() => parseFenPlacement(fen), [fen]);

  const board = (
    <BoardLayout
      flipped={flipped}
      showCoordinates={showCoordinates}
      themeColors={getBoardThemeColors(preferences.boardTheme)}
      rounded={false}
      squareProps={({ square }) => ({
        highlightType:
          lastMove && (square === lastMove.from || square === lastMove.to) ? 'last-move' : 'none',
      })}
      renderSquare={({ square }) => {
        const piece = pieces.get(square);
        return piece ? (
          <ChessPieceIcon type={piece.type} color={piece.color} className="w-[80%] h-[80%]" />
        ) : null;
      }}
    />
  );

  if (responsive) {
    return <div className={`w-full overflow-hidden ${rounded}`}>{board}</div>;
  }

  return (
    <div className="shrink-0 overflow-hidden rounded-sm" style={{ width: size }}>
      {board}
    </div>
  );
}
