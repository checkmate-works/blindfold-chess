export type Quadrant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Tint per board quadrant, shared by the two rank-guide boards so the legend
 * one draws and the highlight the other draws agree.
 *
 * `QuadrantBoard` had these four classes inline in an if/else chain while
 * `HighlightQuadrantBoard` had already lifted them into a record — the two
 * sit in the same directory and illustrate the same lesson to the reader, so
 * a colour changed in one and not the other would teach it wrong.
 */
export const QUADRANT_COLORS: Record<Quadrant, string> = {
  'top-left': 'bg-blue-500/20',
  'top-right': 'bg-emerald-500/20',
  'bottom-left': 'bg-amber-500/20',
  'bottom-right': 'bg-rose-500/20',
};

/** Which quadrant a square falls in. Indices are 0-based from the top-left. */
export function getQuadrant(fileIndex: number, rankIndex: number): Quadrant {
  const isTopHalf = rankIndex < 4;
  const isLeftHalf = fileIndex < 4;
  if (isTopHalf && isLeftHalf) return 'top-left';
  if (isTopHalf && !isLeftHalf) return 'top-right';
  if (!isTopHalf && isLeftHalf) return 'bottom-left';
  return 'bottom-right';
}
