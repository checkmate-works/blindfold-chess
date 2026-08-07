import { HighlightedBoard, type Overlay } from './_shared/HighlightedBoard';
import { ArrowMarker } from './_shared/arrow-marker';

const MARKER_ID = 'diag-arrow';

const ARROWS = Array.from({ length: 7 }, (_, i) => {
  const startRank = i + 1;
  const endFile = 9 - startRank;
  return {
    x1: 6.25,
    y1: (8 - startRank) * 12.5 + 6.25,
    x2: (endFile - 1) * 12.5 + 6.25,
    y2: 6.25,
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

export function DiagonalAFileArrowsBoard({ className }: { className?: string }) {
  return (
    <HighlightedBoard
      overlays={OVERLAYS}
      defs={<ArrowMarker id={MARKER_ID} />}
      className={className}
    />
  );
}
