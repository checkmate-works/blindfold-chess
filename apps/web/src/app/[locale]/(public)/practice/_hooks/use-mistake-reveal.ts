'use client';

import { useEffect, useId, useState } from 'react';

import { registerMistakeReveal } from '../_lib/mistake-reveal';

/**
 * Lets the score summary's "Incorrect" count open every missed row of a
 * problem list and scroll to the first one.
 *
 * Rows start collapsed, so only scrolling would land the reader on a column
 * of closed cards with no hint of which to read. Problems the time limit cut
 * off count as missed too: the reader wants their answer just as much. The
 * opened rows stay ordinary toggles afterwards.
 *
 * @param missedIndexes Indexes of the rows to open, in list order.
 * @param expand Adds the given indexes to the list's open rows.
 * @returns The DOM id to put on each row's wrapper, so it can be scrolled to.
 */
export function useMistakeReveal(
  missedIndexes: readonly number[],
  expand: (indexes: readonly number[]) => void
): (index: number) => string {
  const idPrefix = useId();
  // Scroll after the rows have opened and rendered, so the target sits where
  // it will stay. A fresh object per press lets the same row be sent to again.
  const [scrollTarget, setScrollTarget] = useState<{ index: number }>();

  // Compared as a string so the effect does not re-register on every render
  // of a caller that rebuilds the array.
  const missedKey = missedIndexes.join(',');

  useEffect(() => {
    if (missedKey === '') return;
    const indexes = missedKey.split(',').map(Number);
    return registerMistakeReveal(() => {
      expand(indexes);
      setScrollTarget({ index: indexes[0] });
    });
  }, [missedKey, expand]);

  useEffect(() => {
    if (scrollTarget === undefined) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(`${idPrefix}-${scrollTarget.index}`)
      ?.scrollIntoView({ behavior: prefersReducedMotion ? 'instant' : 'smooth', block: 'start' });
  }, [idPrefix, scrollTarget]);

  return (index) => `${idPrefix}-${index}`;
}
