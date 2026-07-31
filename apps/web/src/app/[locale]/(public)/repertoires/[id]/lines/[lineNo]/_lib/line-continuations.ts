import type { LineForTransposition } from '@/lib/repertoires/line-transpositions';
import { findLineTranspositions } from '@/lib/repertoires/line-transpositions';

/** A "the rest of this position lives elsewhere" link, resolved for display. */
export type ContinuationLink = {
  /** Target line's stable URL number (`repertoire_lines.line_no`). */
  lineNo: number;
  label: string;
  /** Ply to focus on arrival (`?move=`) — the position current just showed. */
  ply: number;
  /** Moves left in the target line from that ply, for the "+N moves" copy. */
  remainingPlies: number;
};

/**
 * Resolve `findLineTranspositions`' continuations into display-ready links.
 * `resolve` maps an other line's id to the URL number + label the caller
 * already computed for its nav list, so this never recomputes a label.
 */
export function buildContinuationLinks(
  current: LineForTransposition,
  others: LineForTransposition[],
  resolve: (lineId: string) => { lineNo: number; label: string }
): ContinuationLink[] {
  const { continuations } = findLineTranspositions(current, others);
  return continuations.map((segment) => {
    const { lineNo, label } = resolve(segment.otherLineId);
    return {
      lineNo,
      label,
      ply: segment.otherFromPly + (segment.toPly - segment.fromPly),
      remainingPlies: segment.otherContinuationPlies,
    };
  });
}
