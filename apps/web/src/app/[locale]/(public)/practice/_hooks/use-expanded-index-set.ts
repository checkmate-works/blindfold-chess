'use client';

import { useCallback, useState } from 'react';

/**
 * Which rows of a list are expanded, keyed by index, with a toggle per row.
 *
 * Both problem lists on a practice result screen let the reader open any
 * number of rows at once, and both kept that as a `Set<number>` in state
 * with the same add-or-delete toggle written out.
 */
export function useExpandedIndexSet() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  return { expanded, toggle };
}
