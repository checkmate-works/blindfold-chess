'use client';

import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { renderPieceOnSquare } from './_shared/render-piece-on-square';

const RANK_8_SQUARES = Array.from({ length: 8 }, (_, i) => ({ x: i * 12.5, y: 0 }));

const DIAGONAL_PATH = [
  { x: 37.5, y: 12.5 }, // d7
  { x: 50, y: 0 }, // e8
];

const OVERLAYS: Overlay[] = [
  { kind: 'rect', squares: RANK_8_SQUARES, fill: '#fbbf24', opacity: 0.25 },
  { kind: 'rect', squares: DIAGONAL_PATH, fill: '#10b981', opacity: 0.4 },
];

const renderSquare = renderPieceOnSquare('d7', 'b');

export function DiagonalEndRank8Board({ className }: { className?: string }) {
  return <HighlightedBoard overlays={OVERLAYS} renderSquare={renderSquare} className={className} />;
}
