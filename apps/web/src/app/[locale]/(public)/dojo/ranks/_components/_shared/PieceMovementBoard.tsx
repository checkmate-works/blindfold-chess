'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { ChessPieceIcon } from '@blindfold-chess/icons';
import type { PieceColor, PieceType } from '@blindfold-chess/types';

import { useBoardTheme } from '../useBoardTheme';

const DEFAULT_CLASS_NAME = 'mx-auto max-w-xs sm:max-w-sm';

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
  className = DEFAULT_CLASS_NAME,
}: PieceMovementBoardProps) {
  const { themeColors, isLoaded } = useBoardTheme();

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
