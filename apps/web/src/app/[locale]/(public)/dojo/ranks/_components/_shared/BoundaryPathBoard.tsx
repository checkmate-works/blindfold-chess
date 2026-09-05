'use client';

import { HighlightedBoard, type Overlay, type SquareCoord } from './HighlightedBoard';
import { renderPieceOnSquare } from './render-piece-on-square';

type Boundary = 'a-file' | 'h-file' | 'rank-1' | 'rank-8';

const BOUNDARY_SQUARES: Record<Boundary, SquareCoord[]> = {
  'a-file': Array.from({ length: 8 }, (_, i) => ({ x: 0, y: i * 12.5 })),
  'h-file': Array.from({ length: 8 }, (_, i) => ({ x: 87.5, y: i * 12.5 })),
  'rank-1': Array.from({ length: 8 }, (_, i) => ({ x: i * 12.5, y: 87.5 })),
  'rank-8': Array.from({ length: 8 }, (_, i) => ({ x: i * 12.5, y: 0 })),
};

type Props = {
  boundary: Boundary;
  path: SquareCoord[];
  pieceSquare: string;
  className?: string;
};

/** Board illustration shared by the diagonal boundary examples. */
export function BoundaryPathBoard({ boundary, path, pieceSquare, className }: Props) {
  const overlays: Overlay[] = [
    { kind: 'rect', squares: BOUNDARY_SQUARES[boundary], fill: '#fbbf24', opacity: 0.25 },
    { kind: 'rect', squares: path, fill: '#10b981', opacity: 0.4 },
  ];

  return (
    <HighlightedBoard
      overlays={overlays}
      renderSquare={renderPieceOnSquare(pieceSquare, 'b')}
      className={className}
    />
  );
}
