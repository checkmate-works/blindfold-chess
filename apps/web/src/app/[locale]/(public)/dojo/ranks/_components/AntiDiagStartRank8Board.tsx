'use client';

import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { renderPieceOnSquare } from './_shared/render-piece-on-square';

const RANK_8_SQUARES = Array.from({ length: 8 }, (_, i) => ({ x: i * 12.5, y: 0 }));

const ANTI_DIAGONAL_PATH = [
  { x: 62.5, y: 12.5 }, // f7
  { x: 50, y: 0 }, // e8
];

const OVERLAYS: Overlay[] = [
  { kind: 'rect', squares: RANK_8_SQUARES, fill: '#fbbf24', opacity: 0.25 },
  { kind: 'rect', squares: ANTI_DIAGONAL_PATH, fill: '#10b981', opacity: 0.4 },
];

const renderSquare = renderPieceOnSquare('f7', 'b');

export function AntiDiagStartRank8Board({ className }: { className?: string }) {
  return <HighlightedBoard overlays={OVERLAYS} renderSquare={renderSquare} className={className} />;
}
