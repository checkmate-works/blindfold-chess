'use client';

import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { ArrowMarker } from './_shared/arrow-marker';

const MARKER_ID = 'antidiag-a-arrow';

const ARROWS = Array.from({ length: 7 }, (_, i) => {
  const startRank = 8 - i; // 8, 7, 6, 5, 4, 3, 2
  return {
    x1: 6.25,
    y1: (8 - startRank) * 12.5 + 6.25,
    x2: (startRank - 1) * 12.5 + 6.25,
    y2: 93.75,
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

export function AntiDiagAFileArrowsBoard({ className }: { className?: string }) {
  return (
    <HighlightedBoard
      overlays={OVERLAYS}
      defs={<ArrowMarker id={MARKER_ID} />}
      className={className}
    />
  );
}
