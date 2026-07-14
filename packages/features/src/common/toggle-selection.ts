/**
 * Toggle `item`'s membership in `selected`, refusing to shrink the selection
 * below `minSelected` entries (practice settings need at least one piece kind
 * enabled, or the question generator has nothing to draw from).
 *
 * Returns the input array unchanged (same reference) when the toggle is
 * rejected, so callers can compare identity to skip persistence.
 */
export function toggleSelection<T>(
  selected: T[],
  item: T,
  minSelected = 1,
): T[] {
  if (selected.includes(item)) {
    if (selected.length <= minSelected) return selected;
    return selected.filter((entry) => entry !== item);
  }
  return [...selected, item];
}
