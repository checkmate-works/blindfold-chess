/**
 * SVG <marker> element rendering a small filled triangle, suitable as a
 * marker-end arrowhead on Diagonal/AntiDiagonal arrow boards.
 *
 * The four boards with arrow overlays (Diagonal/AntiDiag × A-file/Rank
 * variants) each defined an identical marker with a different `id`. We
 * keep separate IDs to avoid collisions when multiple boards render on
 * the same page.
 */
export function ArrowMarker({ id, fill = '#10b981' }: { id: string; fill?: string }) {
  return (
    <marker id={id} markerWidth="4" markerHeight="3" refX="3.5" refY="1.5" orient="auto">
      <path d="M 0 0 L 4 1.5 L 0 3 Z" fill={fill} />
    </marker>
  );
}
