'use client';

import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { renderPieceOnSquare } from './_shared/render-piece-on-square';

const RANK_1_SQUARES = Array.from({ length: 8 }, (_, i) => ({ x: i * 12.5, y: 87.5 }));

const DIAGONAL_PATH = [
  { x: 62.5, y: 50 }, // f4
  { x: 50, y: 62.5 }, // e3
  { x: 37.5, y: 75 }, // d2
  { x: 25, y: 87.5 }, // c1
];

const OVERLAYS: Overlay[] = [
  { kind: 'rect', squares: RANK_1_SQUARES, fill: '#fbbf24', opacity: 0.25 },
  { kind: 'rect', squares: DIAGONAL_PATH, fill: '#10b981', opacity: 0.4 },
];

const renderSquare = renderPieceOnSquare('f4', 'b');

export function DiagonalStartRank1Board({ className }: { className?: string }) {
  return <HighlightedBoard overlays={OVERLAYS} renderSquare={renderSquare} className={className} />;
}
