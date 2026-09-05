'use client';

import { BoundaryPathBoard } from './_shared/BoundaryPathBoard';

const ANTI_DIAGONAL_PATH = [
  { x: 25, y: 62.5 }, // c3
  { x: 37.5, y: 75 }, // d2
  { x: 50, y: 87.5 }, // e1
];

export function AntiDiagEndRank1Board({ className }: { className?: string }) {
  return (
    <BoundaryPathBoard
      boundary="rank-1"
      path={ANTI_DIAGONAL_PATH}
      pieceSquare="c3"
      className={className}
    />
  );
}
