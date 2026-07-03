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
 *
 * Deliberately the ONLY `loading.tsx` under `(protected)`. A folder-scoped
 * `loading.tsx` on an individual route (e.g. `mypage/(confirmed)/profile/`)
 * would nest an extra `<Suspense>` boundary inside this one — even rendering
 * the identical fallback component, that's a redundant double mount with no
 * benefit, and a second place that could drift out of sync with
 * {@link resolveLoadingFallback} if either were edited independently. Keep
 * per-route skeletons as entries in the shared resolver instead.
 */
export default function Loading() {
  return resolveLoadingFallback(usePathname());
}
