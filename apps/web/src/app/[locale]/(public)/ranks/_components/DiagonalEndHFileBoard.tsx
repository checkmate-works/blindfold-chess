'use client';

import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { renderPieceOnSquare } from './_shared/render-piece-on-square';

const H_FILE_SQUARES = Array.from({ length: 8 }, (_, i) => ({ x: 87.5, y: i * 12.5 }));

const DIAGONAL_PATH = [
  { x: 62.5, y: 50 }, // f4
  { x: 75, y: 37.5 }, // g5
  { x: 87.5, y: 25 }, // h6
];

const OVERLAYS: Overlay[] = [
  { kind: 'rect', squares: H_FILE_SQUARES, fill: '#fbbf24', opacity: 0.25 },
  { kind: 'rect', squares: DIAGONAL_PATH, fill: '#10b981', opacity: 0.4 },
];

const renderSquare = renderPieceOnSquare('f4', 'b');

export function DiagonalEndHFileBoard({ className }: { className?: string }) {
  return <HighlightedBoard overlays={OVERLAYS} renderSquare={renderSquare} className={className} />;
}
