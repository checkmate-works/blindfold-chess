'use client';

import { useEffect, useLayoutEffect } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useLatestRef } from '@blindfold-chess/features/common/client';
import * as Sentry from '@sentry/nextjs';

// `useLayoutEffect` warns when executed during SSR; this component only does
// browser work, so the server render can safely fall back to `useEffect`
// (which never runs there either).
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Recover from back/forward navigations that Next.js silently ignores.
 *
 * On iOS Safari, a swipe-back sometimes fires `popstate` with
 * `event.state === null` even though the entry was created by the App
 * Router (observed in production as Sentry BLINDFOLD-CHESS-2J: 47 crashes
 * inside next-navigation-guard's popstate listener, all Mobile Safari,
 * before the null-guard patch in `patches/next-navigation-guard@0.2.0.patch`
 * silenced them). Next.js's own `popstate` handler early-returns on a null
 * state (`onPopState` in `next/dist/client/components/app-router.js`), so
 * the URL changes but the screen does not — the user perceives the swipe as
 * a no-op and swipes again, landing two screens back.
 *
 * This component does two things when that happens:
 *
 * 1. **Telemetry** — reports the event to Sentry with enough context
 *    (target URL, the URL the router still renders, history length, page
 *    load type, time since load) to eventually pin down WHY WebKit hands us
 *    a null state for these entries.
 * 2. **Recovery** — soft-navigates to the browser's actual URL via
 *    `router.replace`, so the user gets the screen they swiped to. The
 *    replace also re-stamps the entry with Next's internal state (`__NA` +
 *    tree), healing it: without this, next-navigation-guard's pass-through
 *    branch stamps only its own keys onto the entry, and a later traversal
 *    onto a `__NA`-less state makes Next fall back to a full
 *    `window.location.reload()`.
 *
 * Registered in a layout effect on purpose: layout effects flush bottom-up,
 * so this listener attaches before `NavigationGuardProvider`'s own popstate
 * listener (registered in the provider's layout effect higher up the tree).
 * That ordering keeps this logger observable even for events the guard
 * discards with `stopImmediatePropagation()` in its `delta === 0` branch.
 *
 * Hash-only traversals are excluded deliberately: the comparison ignores
 * `location.hash`, so a null-state entry that differs only by fragment is
 * left to the browser's native scroll handling instead of being replaced
 * (which would yank the viewport to the top).
 */
export function NullHistoryStateRecovery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.toString();
  const renderedUrlRef = useLatestRef(search ? `${pathname}?${search}` : pathname);
  const routerRef = useLatestRef(router);

  useIsomorphicLayoutEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if (event.state !== null) return;

      const actualUrl = window.location.pathname + window.location.search;
      const renderedUrl = renderedUrlRef.current;
      // Same URL (ignoring hash): nothing to recover. Covers legacy WebKit's
      // load-time popstate and fragment-only traversals.
      if (actualUrl === renderedUrl) return;

      const navEntry = performance.getEntriesByType('navigation')[0] as
        PerformanceNavigationTiming | undefined;
      Sentry.captureMessage('popstate with null history state recovered', {
        level: 'warning',
        extra: {
          actualUrl: window.location.href,
          renderedUrl,
          historyLength: window.history.length,
          referrer: document.referrer,
          msSinceLoad: Math.round(performance.now()),
          pageLoadType: navEntry?.type,
          visibilityState: document.visibilityState,
        },
      });

      routerRef.current.replace(actualUrl + window.location.hash);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [renderedUrlRef, routerRef]);

  return null;
}
