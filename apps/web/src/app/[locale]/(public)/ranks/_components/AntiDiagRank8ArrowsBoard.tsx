'use client';

import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { ArrowMarker } from './_shared/arrow-marker';

const MARKER_ID = 'antidiag-r8-arrow';

const ARROWS = Array.from({ length: 6 }, (_, i) => {
  const startFile = i + 2;
  return {
    x1: (startFile - 1) * 12.5 + 6.25,
    y1: 6.25,
    x2: 93.75,
    y2: (8 - startFile) * 12.5 + 6.25,
  };
});

const OVERLAYS: Overlay[] = [
  {
    kind: 'line',
    lines: ARROWS,
    stroke: '#10b981',
    markerEndId: MARKER_ID,
  },
];

export function AntiDiagRank8ArrowsBoard({ className }: { className?: string }) {
  return (
    <HighlightedBoard
      overlays={OVERLAYS}
      defs={<ArrowMarker id={MARKER_ID} />}
      className={className}
    />
  );
}
