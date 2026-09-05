'use client';

import { BoundaryPathBoard } from './_shared/BoundaryPathBoard';

const DIAGONAL_PATH = [
  { x: 37.5, y: 12.5 }, // d7
  { x: 25, y: 25 }, // c6
  { x: 12.5, y: 37.5 }, // b5
  { x: 0, y: 50 }, // a4
];

export function DiagonalStartAFileBoard({ className }: { className?: string }) {
  return (
    <BoundaryPathBoard
      boundary="a-file"
      path={DIAGONAL_PATH}
      pieceSquare="d7"
      className={className}
    />
  );
}
