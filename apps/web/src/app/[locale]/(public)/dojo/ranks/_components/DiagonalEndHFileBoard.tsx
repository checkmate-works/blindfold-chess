'use client';

import { BoundaryPathBoard } from './_shared/BoundaryPathBoard';

const DIAGONAL_PATH = [
  { x: 62.5, y: 50 }, // f4
  { x: 75, y: 37.5 }, // g5
  { x: 87.5, y: 25 }, // h6
];

export function DiagonalEndHFileBoard({ className }: { className?: string }) {
  return (
    <BoundaryPathBoard
      boundary="h-file"
      path={DIAGONAL_PATH}
      pieceSquare="f4"
      className={className}
    />
  );
}
