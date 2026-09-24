/**
 * A run of plies where this line and a sibling line sit on the same position
 * in lockstep, resolved for display. Plain data with no chess logic, so the
 * client can map the ply in focus onto it without loading chess.js.
 */
export type SharedSegmentLink = {
  /** Current-line span (inclusive, 1-based plies). */
  fromPly: number;
  toPly: number;
  /** Target line's stable URL number (`repertoire_lines.line_no`). */
  lineNo: number;
  label: string;
  /** Target-line ply matching `fromPly`; the two spans advance in lockstep from there. */
  otherFromPly: number;
};

/** One "Line N passes through this position too" link. */
export type SharedPositionLink = {
  lineNo: number;
  label: string;
  /** Ply to focus on arrival (`?move=`) — the target line's copy of the position in focus. */
  ply: number;
};

/** How many shared-position links to list before collapsing the rest into a count. */
export const MAX_SHARED_POSITION_LINKS = 3;

/**
 * Pick the "this position also appears in Line N" links for the ply in focus.
 *
 * - A segment applies when `fromPly <= ply <= toPly`; its target ply is the
 *   other line's ply at the same offset into the span, so the link lands on
 *   the exact position the board is showing.
 * - At the line's final ply, when "continues in" links are shown, this
 *   returns nothing: both blocks would sit in the same slot under the board,
 *   and at the end of a line "where the rest of it lives" is the fact worth
 *   the space. Mid-line, continuations are not shown, so there is no conflict.
 * - One link per target line. A line that revisits the position (or crosses
 *   this one at two offsets) yields more than one segment covering the same
 *   ply; the first in detection order (earliest `fromPly`) wins.
 * - At most {@link MAX_SHARED_POSITION_LINKS} links; `remaining` is how many
 *   further lines were left out, for an "and N more" note.
 */
export function selectSharedPositionLinks({
  segments,
  ply,
  maxPly,
  hasContinuations,
}: {
  segments: SharedSegmentLink[];
  ply: number;
  maxPly: number;
  hasContinuations: boolean;
}): { links: SharedPositionLink[]; remaining: number } {
  if (ply === maxPly && hasContinuations) return { links: [], remaining: 0 };

  const byLine = new Map<number, SharedPositionLink>();
  for (const segment of segments) {
    if (ply < segment.fromPly || ply > segment.toPly) continue;
    if (byLine.has(segment.lineNo)) continue;
    byLine.set(segment.lineNo, {
      lineNo: segment.lineNo,
      label: segment.label,
      ply: segment.otherFromPly + (ply - segment.fromPly),
    });
  }

  const all = [...byLine.values()];
  return {
    links: all.slice(0, MAX_SHARED_POSITION_LINKS),
    remaining: Math.max(0, all.length - MAX_SHARED_POSITION_LINKS),
  };
}

/**
 * Whether the position at `ply` is also reached by another line (in a true
 * transposition, not just a shared opening prefix) — the annotation panel's
 * "shared with other lines" badge. Unlike {@link selectSharedPositionLinks}
 * this ignores the final-ply precedence rule: a note is shared regardless of
 * which link block is on screen.
 */
export function isPositionSharedWithOtherLines(
  segments: SharedSegmentLink[],
  ply: number
): boolean {
  return segments.some((segment) => segment.fromPly <= ply && ply <= segment.toPly);
}
