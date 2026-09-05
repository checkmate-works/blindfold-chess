'use client';

import { BoundaryPathBoard } from './_shared/BoundaryPathBoard';

const ANTI_DIAGONAL_PATH = [
  { x: 62.5, y: 12.5 }, // f7
  { x: 75, y: 25 }, // g6
  { x: 87.5, y: 37.5 }, // h5
];

export function AntiDiagEndHFileBoard({ className }: { className?: string }) {
  return (
    <BoundaryPathBoard
      boundary="h-file"
      path={ANTI_DIAGONAL_PATH}
      pieceSquare="f7"
      className={className}
    />
  );
}
