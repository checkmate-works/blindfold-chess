'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useLatestRef } from '@blindfold-chess/features/common/client';
import * as Sentry from '@sentry/nextjs';

// `useLayoutEffect` warns when executed during SSR; this component only does
// browser work, so the server render can safely fall back to `useEffect`
// (which never runs there either).
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** How often the no-popstate watchdog samples the URL. */
const WATCHDOG_INTERVAL_MS = 1200;
/**
 * How long after a state-carrying popstate the router is given to commit the
 * traversal before we recover. Covers the RSC fetch of a `force-dynamic`
 * route on a slow connection; a legitimate commit that takes even longer is
 * merely duplicated by the recovery replace, which converges to the same
 * screen.
 */
const TRAVERSAL_COMMIT_GRACE_MS = 3500;
/** Do not re-attempt a recovery to the same URL within this window. */
const RECOVERY_COOLDOWN_MS = 5000;

function readGuardIndex(state: unknown): number | null {
  if (typeof state !== 'object' || state === null) return null;
  const raw = (state as Record<string, unknown>).__next_navigation_guard_stack_index;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function hasNextInternalState(state: unknown): boolean {
  return typeof state === 'object' && state !== null && '__NA' in state;
}

/**
 * Recover from back/forward traversals that never reach the App Router.
 *
 * iOS WebKit (every iOS browser, Chrome included) mishandles swipe-back over
 * history entries created by `history.pushState()` outside of a user
 * activation — WebKit bug 248303, an iOS 16 regression: such entries are
 * treated as JS "dummy" entries and the swipe-back gesture skips them and/or
 * fires no `popstate` for them, while programmatic `history.back()` and
 * desktop back buttons behave normally. Next.js creates EVERY soft-navigation
 * entry via `pushState` at commit time — i.e. after the RSC fetch, outside
 * the original tap's activation — so entries whose triggering interaction
 * WebKit does not credit (observed with the leaderboard period `<select>`,
 * whose `change` fires from the native picker overlay with no page-level
 * gesture) are exactly the entries a swipe-back breaks on: the URL moves,
 * the router never hears about it, the screen freezes on the old page.
 *
 * A second, rarer WebKit variant fires the popstate but with
 * `event.state === null` (observed in production as Sentry
 * BLINDFOLD-CHESS-2J, all Mobile Safari); Next.js's own popstate handler
 * early-returns on a null state, with the same frozen-screen result.
 *
 * This component watches for every "the browser moved but the router did
 * not" variant and does two things:
 *
 * 1. **Telemetry** — each variant reports a distinct Sentry message so the
 *    field distribution tells us which WebKit behaviour we are actually
 *    seeing:
 *    - `popstate with null history state recovered` (null-state variant)
 *    - `popstate was not applied by the router` (state delivered, no commit)
 *    - `url changed without popstate recovered` (suppressed popstate — the
 *      WebKit 248303 signature)
 *    - `history traversal skipped entries` (diagnostic only: the
 *      next-navigation-guard stack index in the arriving state jumped by
 *      more than 1, i.e. WebKit skipped over dummy entries; the router can
 *      still render the landing entry, so nothing is recovered)
 * 2. **Recovery** — soft-navigates to the browser's actual URL via
 *    `router.replace`, so the user gets the screen they swiped to. The
 *    replace also re-stamps the entry with Next's internal state (`__NA` +
 *    tree), healing it for future traversals.
 *
 * The popstate listener is registered in a layout effect on purpose: layout
 * effects flush bottom-up, so it attaches before `NavigationGuardProvider`'s
 * own popstate listener (registered in the provider's layout effect higher up
 * the tree). That ordering keeps this logger observable even for events the
 * guard discards with `stopImmediatePropagation()` in its `delta === 0`
 * branch. The suppressed-popstate variant is caught by an interval watchdog
 * instead — by definition no event fires for it. The watchdog requires the
 * same mismatch on two consecutive ticks so a mid-commit render never trips
 * it, and hash-only differences never count as a mismatch (fragment
 * traversals are the browser's business). Every mismatch check compares
 * canonically-encoded queries — see {@link canonicalActualUrl}, without which
 * a link whose query was built with `encodeURIComponent` reports a permanent
 * false mismatch.
 */
export function HistoryTraversalRecovery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.toString();
  const renderedUrlRef = useLatestRef(search ? `${pathname}?${search}` : pathname);
  const routerRef = useLatestRef(router);

  // Last guard stack index observed on the current entry. Refreshed on every
  // commit (effect below) and every watchdog tick, so a popstate can compare
  // the arriving entry's index against where we just were and detect WebKit
  // skipping over entries.
  const lastKnownGuardIndexRef = useRef<number | null>(null);

  // Sample after every commit — navigations rewrite history.state.
  useEffect(() => {
    const idx = readGuardIndex(window.history.state);
    if (idx !== null) lastKnownGuardIndexRef.current = idx;
  });

  useIsomorphicLayoutEffect(() => {
    let lastPopstateAtMs = Number.NEGATIVE_INFINITY;
    let lastRecovery = { url: '', atMs: 0 };
    let pendingMismatchUrl: string | null = null;
    let commitCheckTimer: ReturnType<typeof setTimeout> | undefined;

    const actualUrl = () => window.location.pathname + window.location.search;

    /**
     * The browser URL with its query re-serialised the way
     * `useSearchParams().toString()` serialises it, so the two sides of every
     * mismatch check speak the same encoding.
     *
     * `window.location.search` preserves whatever spelling the href that
     * created the entry used, while `URLSearchParams.toString()` always emits
     * application/x-www-form-urlencoded. A link built with
     * `encodeURIComponent` — e.g. `games/new/position?fen=${...}` — therefore
     * sits in the address bar as `?fen=…%20w%20-…` and reaches the router as
     * `?fen=…+w+-…`: one query, two spellings, and a mismatch that never
     * resolves, because the recovery `replace` re-uses the browser's spelling.
     * Sentry BLINDFOLD-CHESS-5N was 117 such false recoveries fired every
     * cooldown window on `/games/new/position`, all with `historyLength: 1`
     * (no history entry to traverse to at all). Space is the common case;
     * `~ ! ' ( ) *` also differ between the two encoders.
     *
     * Only the comparison is canonicalised — a genuine recovery still replaces
     * to the browser's own URL, so a real traversal is not silently re-spelled.
     */
    const canonicalActualUrl = () => {
      const search = new URLSearchParams(window.location.search).toString();
      return search ? `${window.location.pathname}?${search}` : window.location.pathname;
    };

    const diagnostics = () => {
      const navEntry = performance.getEntriesByType('navigation')[0] as
        PerformanceNavigationTiming | undefined;
      return {
        actualUrl: window.location.href,
        renderedUrl: renderedUrlRef.current,
        historyLength: window.history.length,
        referrer: document.referrer,
        msSinceLoad: Math.round(performance.now()),
        pageLoadType: navEntry?.type,
        visibilityState: document.visibilityState,
      };
    };

    const recover = (message: string, extra: Record<string, unknown> = {}) => {
      const url = actualUrl();
      const now = performance.now();
      if (lastRecovery.url === url && now - lastRecovery.atMs < RECOVERY_COOLDOWN_MS) return;
      lastRecovery = { url, atMs: now };
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: { ...diagnostics(), ...extra },
      });
      routerRef.current.replace(url + window.location.hash);
    };

    const onPopState = (event: PopStateEvent) => {
      lastPopstateAtMs = performance.now();

      // Entry-skip diagnostic: a well-behaved one-step traversal moves the
      // guard index by exactly 1.
      const arrivingIndex = readGuardIndex(event.state);
      const previousIndex = lastKnownGuardIndexRef.current;
      if (arrivingIndex !== null && previousIndex !== null) {
        const jump = Math.abs(arrivingIndex - previousIndex);
        if (jump > 1) {
          Sentry.captureMessage('history traversal skipped entries', {
            level: 'warning',
            extra: { ...diagnostics(), fromGuardIndex: previousIndex, toGuardIndex: arrivingIndex },
          });
        }
      }
      if (arrivingIndex !== null) lastKnownGuardIndexRef.current = arrivingIndex;

      if (event.state === null) {
        // Same URL (ignoring hash): nothing to recover. Covers legacy
        // WebKit's load-time popstate and fragment-only traversals.
        if (canonicalActualUrl() !== renderedUrlRef.current) {
          recover('popstate with null history state recovered');
        }
        return;
      }

      // A state-carrying popstate is Next's to handle (or, without __NA, to
      // hard-reload). Verify the router actually committed the traversal.
      clearTimeout(commitCheckTimer);
      const hadTree = hasNextInternalState(event.state);
      commitCheckTimer = setTimeout(() => {
        if (canonicalActualUrl() !== renderedUrlRef.current) {
          recover('popstate was not applied by the router', { popstateHadNextState: hadTree });
        }
      }, TRAVERSAL_COMMIT_GRACE_MS);
    };

    // Watchdog for the suppressed-popstate variant: the URL changed under
    // our feet with no popstate at all (WebKit 248303).
    const tick = () => {
      const idx = readGuardIndex(window.history.state);
      if (idx !== null) lastKnownGuardIndexRef.current = idx;

      const url = canonicalActualUrl();
      if (url === renderedUrlRef.current) {
        pendingMismatchUrl = null;
        return;
      }
      // A recent popstate means the traversal is owned by the paths above.
      if (performance.now() - lastPopstateAtMs < TRAVERSAL_COMMIT_GRACE_MS) return;
      // Two-tick confirmation: never act on a transient mid-commit snapshot.
      if (pendingMismatchUrl !== url) {
        pendingMismatchUrl = url;
        return;
      }
      pendingMismatchUrl = null;
      recover('url changed without popstate recovered');
    };
    const watchdog = setInterval(tick, WATCHDOG_INTERVAL_MS);

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      clearInterval(watchdog);
      clearTimeout(commitCheckTimer);
    };
  }, [renderedUrlRef, routerRef, lastKnownGuardIndexRef]);

  return null;
}
