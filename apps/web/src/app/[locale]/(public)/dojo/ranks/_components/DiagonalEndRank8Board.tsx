'use client';

import { BoundaryPathBoard } from './_shared/BoundaryPathBoard';

const DIAGONAL_PATH = [
  { x: 37.5, y: 12.5 }, // d7
  { x: 50, y: 0 }, // e8
];

export function DiagonalEndRank8Board({ className }: { className?: string }) {
  return (
    <BoundaryPathBoard
      boundary="rank-8"
      path={DIAGONAL_PATH}
      pieceSquare="d7"
      className={className}
    />
  );
}
