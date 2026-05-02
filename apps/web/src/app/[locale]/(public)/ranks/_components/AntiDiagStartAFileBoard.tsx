'use client';

import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { renderPieceOnSquare } from './_shared/render-piece-on-square';

const A_FILE_SQUARES = Array.from({ length: 8 }, (_, i) => ({ x: 0, y: i * 12.5 }));

const ANTI_DIAGONAL_PATH = [
  { x: 25, y: 62.5 }, // c3
  { x: 12.5, y: 50 }, // b4
  { x: 0, y: 37.5 }, // a5
];

const OVERLAYS: Overlay[] = [
  { kind: 'rect', squares: A_FILE_SQUARES, fill: '#fbbf24', opacity: 0.25 },
  { kind: 'rect', squares: ANTI_DIAGONAL_PATH, fill: '#10b981', opacity: 0.4 },
];

const renderSquare = renderPieceOnSquare('c3', 'b');

export function AntiDiagStartAFileBoard({ className }: { className?: string }) {
  return <HighlightedBoard overlays={OVERLAYS} renderSquare={renderSquare} className={className} />;
}
