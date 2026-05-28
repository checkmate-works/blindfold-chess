'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { ChessPieceIcon } from '@blindfold-chess/icons';

import { useBoardTheme } from '../useBoardTheme';

type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
type PieceColor = 'w' | 'b';

export type StaticPiecePlacement = {
  square: string;
  type: PieceType;
  color: PieceColor;
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const PIECE_LETTERS: ReadonlySet<string> = new Set(['k', 'q', 'r', 'b', 'n', 'p']);

/**
 * Parse the piece-placement field of a FEN into {@link StaticPiecePlacement}s.
 *
 * Deliberately chess.js-free (no validation): the rank guides include
 * illegal-by-the-rules positions such as a kingless all-pawns example, which
 * `chess.js` (and therefore `fenToBoard` / `ChessBoard`) would reject. Only
 * the board field is read; side-to-move / castling / clocks are ignored.
 */
export function fenToStaticPlacements(fen: string): StaticPiecePlacement[] {
  const boardField = fen.trim().split(/\s+/)[0] ?? '';
  const placements: StaticPiecePlacement[] = [];

  boardField.split('/').forEach((rankStr, rankIdx) => {
    const rankNumber = 8 - rankIdx;
    let fileIdx = 0;
    for (const ch of rankStr) {
      if (ch >= '1' && ch <= '8') {
        fileIdx += Number(ch);
        continue;
      }
      const lower = ch.toLowerCase();
      const file = FILES[fileIdx];
      if (PIECE_LETTERS.has(lower) && file) {
        placements.push({
          square: `${file}${rankNumber}`,
          type: lower as PieceType,
          color: ch === ch.toUpperCase() ? 'w' : 'b',
        });
      }
      fileIdx += 1;
    }
  });

  return placements;
}

const DEFAULT_CLASS_NAME = 'mx-auto max-w-xs sm:max-w-sm';

type StaticPositionBoardProps = {
  placements: ReadonlyArray<StaticPiecePlacement>;
  className?: string;
};

/**
 * Renders a chess board with a fixed list of piece placements and no
 * interactivity. Used by ranks-guide boards that need to display a multi-piece
 * static position (e.g. the 10-piece random / kingside-castled positions on
 * the 2kyu guide). Unlike `PieceMovementBoard` this places many pieces at
 * once; unlike `ChessBoard` it skips all FEN parsing and move handling.
 */
export function StaticPositionBoard({
  placements,
  className = DEFAULT_CLASS_NAME,
}: StaticPositionBoardProps) {
  const { themeColors, isLoaded } = useBoardTheme();

  const renderSquare = useCallback(
    ({ square }: SquareRenderInfo) => {
      const placement = placements.find((p) => p.square === square);
      if (!placement) return null;
      return <ChessPieceIcon type={placement.type} color={placement.color} size={32} />;
    },
    [placements]
  );

  if (!isLoaded) {
    return (
      <div className={className}>
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className={className}>
      <BoardLayout showCoordinates themeColors={themeColors} renderSquare={renderSquare} />
    </div>
  );
}
