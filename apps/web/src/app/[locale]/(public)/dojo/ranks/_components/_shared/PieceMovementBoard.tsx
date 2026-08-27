'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import {
  BOARD_FRAME_EXPAND_ON_MOBILE_CLASS,
  BOARD_RADIUS_EXPAND_ON_MOBILE,
} from '@/app/_components/chess/BoardFrame';
import { ChessPieceIcon } from '@blindfold-chess/icons';
import type { PieceColor, PieceType } from '@blindfold-chess/types';

import { useBoardTheme } from '../useBoardTheme';

/**
 * These aids sit in prose (`/dojo/guides`, the rank Tips card, learn/manual
 * articles), where the board is the explanation — so it gets the same
 * full-bleed-on-mobile frame every other board in the app has. A caller may
 * still replace it: the Tips card passes `mx-auto max-w-[10rem]` for a
 * thumbnail.
 */
const DEFAULT_CLASS_NAME = BOARD_FRAME_EXPAND_ON_MOBILE_CLASS;

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
  const { themeColors, showCoordinates, isLoaded } = useBoardTheme();

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
        <BoardSkeleton rounded={BOARD_RADIUS_EXPAND_ON_MOBILE} />
      </div>
    );
  }

  return (
    <div className={className}>
      <BoardLayout
        showCoordinates={showCoordinates}
        themeColors={themeColors}
        renderSquare={renderSquare}
        rounded={BOARD_RADIUS_EXPAND_ON_MOBILE}
      />
    </div>
  );
}
