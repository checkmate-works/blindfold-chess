import { useCallback, useState } from 'react';

export type ResultPathHover = {
  hoveredPathIndex: number | null;
  lockedPathIndex: number | null;
  /**
   * Derived highlight: hover takes precedence over lock, falling back to
   * lock when nothing is hovered. `null` when neither is set.
   */
  highlightedPathIndex: number | null;
  setHoveredPathIndex: (index: number | null) => void;
  setLockedPathIndex: (index: number | null) => void;
  /** Clears both hovered and locked indices. */
  resetHover: () => void;
};

/**
 * Result-view path hover/lock state for the route-planner result screen.
 *
 * Intentionally split from `useStagedCoordinate` — the two concerns share
 * no state and have independent lifecycles. Hover is transient; lock is
 * pointer-click-sticky; both feed the `RoutePlannerResultView` highlight.
 */
export function useResultPathHover(): ResultPathHover {
  const [hoveredPathIndex, setHoveredPathIndex] = useState<number | null>(null);
  const [lockedPathIndex, setLockedPathIndex] = useState<number | null>(null);

  const highlightedPathIndex = hoveredPathIndex ?? lockedPathIndex;

  const resetHover = useCallback(() => {
    setHoveredPathIndex(null);
    setLockedPathIndex(null);
  }, []);

  return {
    hoveredPathIndex,
    lockedPathIndex,
    highlightedPathIndex,
    setHoveredPathIndex,
    setLockedPathIndex,
    resetHover,
  };
}
