/**
 * Does `ordered` describe a valid rearrangement of exactly `live`?
 *
 * A reorder is a PERMUTATION, never a partial update: the client sends the
 * whole list back, so anything other than "the same numbers, rearranged" means
 * the two sides disagree about what the list contains. Rejecting that is what
 * keeps a stale tab from doing damage — if a line was deleted elsewhere while
 * someone was dragging, an accept-what-you-can merge would quietly drop the
 * missing line to the end (or, worse, write a `seq` onto a soft-deleted row and
 * revive it in the ordering). The caller re-reads instead.
 *
 * Rejects, specifically: a different count, a duplicate, a number not in `live`,
 * and — via the count check — any line missing from the submission.
 */
export function isCompleteReorder(live: readonly number[], ordered: readonly number[]): boolean {
  const liveSet = new Set(live);
  const orderedSet = new Set(ordered);
  return (
    orderedSet.size === ordered.length &&
    orderedSet.size === liveSet.size &&
    ordered.every((lineNo) => liveSet.has(lineNo))
  );
}
