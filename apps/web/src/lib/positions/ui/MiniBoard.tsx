'use client';

import { useMemo } from 'react';

import { BoardLayout } from '@/app/_components/chess/BoardLayout';
import type { Color } from '@blindfold-chess/features/chess-core';
import { FILES } from '@blindfold-chess/features/common';
import { ChessPieceIcon } from '@blindfold-chess/icons';
import type { PieceType } from '@blindfold-chess/types';

import { getBoardThemeColors } from '@/lib/games/board-themes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

function parseFenChar(ch: string): { type: PieceType; color: Color } | null {
  if (/^[KQRBNP]$/.test(ch)) {
    return { type: ch.toLowerCase() as PieceType, color: 'w' };
  }
  if (/^[kqrbnp]$/.test(ch)) {
    return { type: ch as PieceType, color: 'b' };
  }
  return null;
}

/** FEN placement → square-keyed pieces ("e4" → white pawn). */
function parseFenPlacement(fen: string): Map<string, { type: PieceType; color: Color }> {
  const pieces = new Map<string, { type: PieceType; color: Color }>();
  fen
    .split(' ')[0]
    .split('/')
    .forEach((row, rowIndex) => {
      const rank = 8 - rowIndex;
      let fileIndex = 0;
      for (const ch of row) {
        if (ch >= '1' && ch <= '8') {
          fileIndex += Number(ch);
          continue;
        }
        const piece = parseFenChar(ch);
        if (piece && fileIndex < FILES.length) pieces.set(`${FILES[fileIndex]}${rank}`, piece);
        fileIndex += 1;
      }
    });
  return pieces;
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
  lastMove?: { from: string; to: string } | null;
  /**
   * Off by default: the thumbnail sizes this renders at (120px) have no room
   * for legible file/rank labels. Enlarged views pass the viewer's preference.
   */
  showCoordinates?: boolean;
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
    return <div className="w-full overflow-hidden rounded-sm">{board}</div>;
  }

  return (
    <div className="shrink-0 overflow-hidden rounded-sm" style={{ width: size }}>
      {board}
    </div>
  );
}
