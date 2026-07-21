'use client';

import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { renderPieceOnSquare } from './_shared/render-piece-on-square';

const RANK_1_SQUARES = Array.from({ length: 8 }, (_, i) => ({ x: i * 12.5, y: 87.5 }));

const ANTI_DIAGONAL_PATH = [
  { x: 25, y: 62.5 }, // c3
  { x: 37.5, y: 75 }, // d2
  { x: 50, y: 87.5 }, // e1
];

const OVERLAYS: Overlay[] = [
  { kind: 'rect', squares: RANK_1_SQUARES, fill: '#fbbf24', opacity: 0.25 },
  { kind: 'rect', squares: ANTI_DIAGONAL_PATH, fill: '#10b981', opacity: 0.4 },
];

const renderSquare = renderPieceOnSquare('c3', 'b');

export function AntiDiagEndRank1Board({ className }: { className?: string }) {
  return <HighlightedBoard overlays={OVERLAYS} renderSquare={renderSquare} className={className} />;
}
