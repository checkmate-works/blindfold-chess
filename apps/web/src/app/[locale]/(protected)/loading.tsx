'use client';

import { usePathname } from 'next/navigation';

import { resolveLoadingFallback } from './_lib/resolveLoadingFallback';

/**
 * Pending UI for the inner Suspense boundary of the protected area — it covers
 * the `(confirmed)` layout's auth + the page's data fetch on a hard load (after
 * the layout's auth gate resolves) and client-side navigations into the area.
 *
 * It MUST resolve to the same skeleton the layout's gate `<Suspense>` chose for
 * the current route (see {@link resolveLoadingFallback}); otherwise the user
 * sees the correct skeleton during the gate phase and a mismatched one here.
 * `usePathname()` (client) mirrors the layout's middleware-set `x-pathname` —
 * the boundary fallback must stay synchronous, so it cannot `await headers()`.
 * Individual routes (e.g. `profile/loading.tsx`) still override this with their
 * own layout-matched skeleton.
 */
export default function Loading() {
  return resolveLoadingFallback(usePathname());
}
