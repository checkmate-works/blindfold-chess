'use client';

import { BoundaryPathBoard } from './_shared/BoundaryPathBoard';

const DIAGONAL_PATH = [
  { x: 62.5, y: 50 }, // f4
  { x: 50, y: 62.5 }, // e3
  { x: 37.5, y: 75 }, // d2
  { x: 25, y: 87.5 }, // c1
];

export function DiagonalStartRank1Board({ className }: { className?: string }) {
  return (
    <BoundaryPathBoard
      boundary="rank-1"
      path={DIAGONAL_PATH}
      pieceSquare="f4"
      className={className}
    />
  );
}
