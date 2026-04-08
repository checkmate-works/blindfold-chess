'use client';

import { useEffect, useState } from 'react';

/**
 * Returns whether the given CSS media query currently matches.
 * During SSR and before hydration, returns `false`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Tailwind `md` breakpoint (768px). */
export const MD_BREAKPOINT = '(min-width: 768px)';

/**
 * Returns `true` when the viewport is at or above Tailwind's `md` breakpoint.
 * Returns `false` during SSR and on mobile viewports.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(MD_BREAKPOINT);
}
