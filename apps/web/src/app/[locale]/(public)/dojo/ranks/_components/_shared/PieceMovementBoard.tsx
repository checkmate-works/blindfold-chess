'use client';

import { useCallback } from 'react';

import type { SquareRenderInfo } from '@/app/_components';
import { ChessPieceIcon } from '@blindfold-chess/icons';
import type { PieceColor, PieceType } from '@blindfold-chess/types';

import { ThemedBoardLayout } from './ThemedBoardLayout';

type PieceMovementBoardProps = {
  /** Square the piece is placed on (e.g. 'd4'). */
  pieceSquare: string;
  pieceType: PieceType;
  pieceColor?: PieceColor;
  /** Squares marked as legal-move destinations. */
  legalMoveSquares: string[];
  className?: string;
};

/**
 * Renders a chess board with a single piece on `pieceSquare` and translucent
 * dot markers on every square in `legalMoveSquares`.
 *
 * Shared primitive used by King/Knight/Bishop/Rook/Queen movement guides
 * under ranks/_components.
 */
export function PieceMovementBoard({
  pieceSquare,
  pieceType,
  pieceColor = 'w',
  legalMoveSquares,
  className,
}: PieceMovementBoardProps) {
  const renderSquare = useCallback(
    ({ square, isLight }: SquareRenderInfo) => {
      if (square === pieceSquare) {
        return <ChessPieceIcon type={pieceType} color={pieceColor} size={32} />;
      }
      if (legalMoveSquares.includes(square)) {
        return (
          <span
            className={`text-lg sm:text-2xl select-none ${
              isLight ? 'text-black/30' : 'text-white/30'
            }`}
          >
            ・
          </span>
        );
      }
      return null;
    },
    [pieceSquare, pieceType, pieceColor, legalMoveSquares]
  );

  return <ThemedBoardLayout renderSquare={renderSquare} className={className} />;
}
