import { cache } from 'react';

import 'server-only';

/**
 * Request-scoped "no ads" scope marker.
 *
 * Used by layouts (e.g., a `(no-ads)` route group layout) to declare that
 * the current request's subtree should not render AdSense slots, regardless
 * of user status or global ads-enabled flag.
 *
 * The flag lives inside a `cache()`-backed container so it is per-request
 * and isolated between concurrent requests on the server.
 *
 * Usage:
 *   // In a layout under a `(no-ads)` route group:
 *   export default function NoAdsLayout({ children }) {
 *     markNoAdsScope();
 *     return <>{children}</>;
 *   }
 *
 *   // Consumed by `resolveAdGuard()` which short-circuits to 'hidden'
 *   // when `isNoAdsScope()` returns true.
 *
 * @design
 * - Using `cache()` from React gives us a per-request memoized function.
 *   The returned object reference is stable within a single request, so
 *   mutating `.value` from a layout is observable by a deeper server
 *   component (like `AdSenseGuard`) in the same request.
 * - Layouts are guaranteed to execute their function body before their
 *   children render, so marking the scope in a layout is reliably visible
 *   to descendant pages.
 * - The decision lives in the render tree (layout hierarchy) — moving a
 *   page under a `(no-ads)` route group is sufficient to opt it out, with
 *   no code changes required in the page itself.
 */
const getNoAdsContainer = cache((): { value: boolean } => ({ value: false }));

/**
 * Marks the current request as ad-free.
 *
 * Flow: a layout (e.g., `(no-ads)/layout.tsx`) calls `markNoAdsScope()` →
 * `resolveAdGuard()` (see `src/app/[locale]/_components/AdSense/resolveAdGuard.ts`)
 * short-circuits to `'hidden'` before consulting user / ads-enabled state,
 * so descendant ad slots render nothing.
 */
export function markNoAdsScope(): void {
  getNoAdsContainer().value = true;
}

export function isNoAdsScope(): boolean {
  return getNoAdsContainer().value;
}
