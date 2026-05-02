'use client';

import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { renderPieceOnSquare } from './_shared/render-piece-on-square';

const H_FILE_SQUARES = Array.from({ length: 8 }, (_, i) => ({ x: 87.5, y: i * 12.5 }));

const ANTI_DIAGONAL_PATH = [
  { x: 62.5, y: 12.5 }, // f7
  { x: 75, y: 25 }, // g6
  { x: 87.5, y: 37.5 }, // h5
];

const OVERLAYS: Overlay[] = [
  { kind: 'rect', squares: H_FILE_SQUARES, fill: '#fbbf24', opacity: 0.25 },
  { kind: 'rect', squares: ANTI_DIAGONAL_PATH, fill: '#10b981', opacity: 0.4 },
];

const renderSquare = renderPieceOnSquare('f7', 'b');

export function AntiDiagEndHFileBoard({ className }: { className?: string }) {
  return <HighlightedBoard overlays={OVERLAYS} renderSquare={renderSquare} className={className} />;
}
