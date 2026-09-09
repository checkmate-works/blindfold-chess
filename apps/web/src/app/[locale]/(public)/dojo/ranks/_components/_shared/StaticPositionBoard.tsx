'use client';

import { useCallback } from 'react';

import type { SquareRenderInfo } from '@/app/_components';
import { ChessPieceIcon } from '@blindfold-chess/icons';

import { ThemedBoardLayout } from './ThemedBoardLayout';
import type { StaticPiecePlacement } from './fen-to-static-placements';

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
export function StaticPositionBoard({ placements, className }: StaticPositionBoardProps) {
  const renderSquare = useCallback(
    ({ square }: SquareRenderInfo) => {
      const placement = placements.find((p) => p.square === square);
      if (!placement) return null;
      return <ChessPieceIcon type={placement.type} color={placement.color} size={32} />;
    },
    [placements]
  );

  return <ThemedBoardLayout renderSquare={renderSquare} className={className} />;
}
