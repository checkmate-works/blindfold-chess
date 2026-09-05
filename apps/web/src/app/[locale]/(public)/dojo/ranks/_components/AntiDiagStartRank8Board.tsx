'use client';

import { BoundaryPathBoard } from './_shared/BoundaryPathBoard';

const ANTI_DIAGONAL_PATH = [
  { x: 62.5, y: 12.5 }, // f7
  { x: 50, y: 0 }, // e8
];

export function AntiDiagStartRank8Board({ className }: { className?: string }) {
  return (
    <BoundaryPathBoard
      boundary="rank-8"
      path={ANTI_DIAGONAL_PATH}
      pieceSquare="f7"
      className={className}
    />
  );
}
