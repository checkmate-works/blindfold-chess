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
