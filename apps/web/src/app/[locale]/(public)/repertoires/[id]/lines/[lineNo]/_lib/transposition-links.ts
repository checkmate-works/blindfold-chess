import type { LineForTransposition } from '@/lib/repertoires/line-transpositions';
import { findLineTranspositions } from '@/lib/repertoires/line-transpositions';

import type { SharedSegmentLink } from './shared-segment-links';

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
 * Resolve `findLineTranspositions`' output into display-ready data, from a
 * single detection pass:
 *
 * - `continuations` — the links shown at the line's final position.
 * - `sharedSegments` — every shared run, kept as spans rather than expanded
 *   per ply, so the client maps whichever ply is in focus onto them (see
 *   `selectSharedPositionLinks`). Spans keep the payload proportional to the
 *   number of transpositions instead of to the line's length, and the client
 *   still never touches chess logic.
 *
 * `resolve` maps an other line's id to the URL number + label the caller
 * already computed for its nav list, so this never recomputes a label.
 */
export function buildTranspositionLinks(
  current: LineForTransposition,
  others: LineForTransposition[],
  resolve: (lineId: string) => { lineNo: number; label: string }
): { continuations: ContinuationLink[]; sharedSegments: SharedSegmentLink[] } {
  const { segments, continuations } = findLineTranspositions(current, others);
  return {
    continuations: continuations.map((segment) => {
      const { lineNo, label } = resolve(segment.otherLineId);
      return {
        lineNo,
        label,
        ply: segment.otherFromPly + (segment.toPly - segment.fromPly),
        remainingPlies: segment.otherContinuationPlies,
      };
    }),
    sharedSegments: segments.map((segment) => {
      const { lineNo, label } = resolve(segment.otherLineId);
      return {
        fromPly: segment.fromPly,
        toPly: segment.toPly,
        lineNo,
        label,
        otherFromPly: segment.otherFromPly,
      };
    }),
  };
}
