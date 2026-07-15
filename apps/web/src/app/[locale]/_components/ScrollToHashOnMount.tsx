'use client';

import { useEffect, useRef } from 'react';

/**
 * Client-side fallback for hash-anchor scrolling on a client-side (SPA)
 * navigation. Next.js's built-in scroll-to-hash behavior is inconsistent
 * across this app's dynamic (`force-dynamic`) detail pages when navigated to
 * via `<Link>` — confirmed working for some routes and silently not for
 * others under an otherwise-identical setup (a hard/full navigation to the
 * same URL always scrolls correctly, so the target element and its `id` are
 * not the issue). Rendering this once on a page whose anchor target is
 * present unconditionally at mount (no client-side gating on the element
 * itself — see `GameReview.tsx` for a page where the target is conditional
 * and needs its own bespoke effect instead) guarantees the scroll happens
 * regardless of Next's native behavior for that particular route.
 */
export function ScrollToHashOnMount() {
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (scrolledRef.current) return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    scrolledRef.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  return null;
}
