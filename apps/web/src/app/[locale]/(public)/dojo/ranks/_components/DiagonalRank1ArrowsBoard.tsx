import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { ArrowMarker } from './_shared/arrow-marker';

const MARKER_ID = 'diag-r1-arrow';

const ARROWS = Array.from({ length: 6 }, (_, i) => {
  const startFile = i + 2;
  const endRank = 9 - startFile;
  return {
    x1: (startFile - 1) * 12.5 + 6.25,
    y1: 93.75,
    x2: 93.75,
    y2: (8 - endRank) * 12.5 + 6.25,
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

export function DiagonalRank1ArrowsBoard({ className }: { className?: string }) {
  return (
    <HighlightedBoard
      overlays={OVERLAYS}
      defs={<ArrowMarker id={MARKER_ID} />}
      className={className}
    />
  );
}
