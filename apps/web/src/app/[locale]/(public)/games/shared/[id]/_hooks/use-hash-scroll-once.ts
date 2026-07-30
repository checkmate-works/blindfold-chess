'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll to `#<elementId>` once, when the element first exists.
 *
 * Native hash-anchor scrolling can't reach an element that isn't in the first
 * paint. The review's overview block is the case this exists for:
 * `useMoveNavigation` defaults to the latest move, so the block — and its
 * `id` — only appears after `useReplayDeepLink` navigates to the opening board,
 * by which point the browser's one-shot scroll-to-hash has already fired and
 * found nothing.
 *
 * `ready` gates the attempt on the caller's own "the element is rendered now"
 * condition; the scroll runs at most once per mount, so a later navigation back
 * to the same block does not yank the viewport.
 */
export function useHashScrollOnce(elementId: string, ready: boolean): void {
  const scrolledRef = useRef(false);

  useEffect(() => {
    if (scrolledRef.current || !ready) return;
    if (window.location.hash !== `#${elementId}`) return;
    const el = document.getElementById(elementId);
    if (!el) return;
    scrolledRef.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [elementId, ready]);
}
