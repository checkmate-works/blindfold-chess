'use client';

import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { renderPieceOnSquare } from './_shared/render-piece-on-square';

const A_FILE_SQUARES = Array.from({ length: 8 }, (_, i) => ({ x: 0, y: i * 12.5 }));

const DIAGONAL_PATH = [
  { x: 37.5, y: 12.5 }, // d7
  { x: 25, y: 25 }, // c6
  { x: 12.5, y: 37.5 }, // b5
  { x: 0, y: 50 }, // a4
];

const OVERLAYS: Overlay[] = [
  { kind: 'rect', squares: A_FILE_SQUARES, fill: '#fbbf24', opacity: 0.25 },
  { kind: 'rect', squares: DIAGONAL_PATH, fill: '#10b981', opacity: 0.4 },
];

const renderSquare = renderPieceOnSquare('d7', 'b');

export function DiagonalStartAFileBoard({ className }: { className?: string }) {
  return <HighlightedBoard overlays={OVERLAYS} renderSquare={renderSquare} className={className} />;
}
