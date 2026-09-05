'use client';

import { BoundaryPathBoard } from './_shared/BoundaryPathBoard';

const ANTI_DIAGONAL_PATH = [
  { x: 25, y: 62.5 }, // c3
  { x: 12.5, y: 50 }, // b4
  { x: 0, y: 37.5 }, // a5
];

export function AntiDiagStartAFileBoard({ className }: { className?: string }) {
  return (
    <BoundaryPathBoard
      boundary="a-file"
      path={ANTI_DIAGONAL_PATH}
      pieceSquare="c3"
      className={className}
    />
  );
}
