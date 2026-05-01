'use client';

import type { SquareRenderInfo } from '@/app/_components';
import { ChessPieceIcon } from '@blindfold-chess/icons';

type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
type PieceColor = 'w' | 'b';

/**
 * Helper that creates a `renderSquare` function placing a single piece icon
 * on the given square and rendering nothing on every other square.
 *
 * Used by ranks-guide boards that highlight a chess piece on top of an
 * otherwise plain board (e.g. DiagonalEndHFileBoard placing a white
 * bishop on f4).
 */
export function renderPieceOnSquare(
  pieceSquare: string,
  pieceType: PieceType,
  pieceColor: PieceColor = 'w'
) {
  return ({ square }: SquareRenderInfo) => {
    if (square === pieceSquare) {
      return <ChessPieceIcon type={pieceType} color={pieceColor} size={32} />;
    }
    return null;
  };
}
