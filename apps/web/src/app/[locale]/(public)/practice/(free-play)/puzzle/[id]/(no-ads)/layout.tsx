import { markNoAdsScope } from '@/lib/ads/no-ads-scope';

/**
 * Ad-free scope layout.
 *
 * Any page placed under this `(no-ads)` route group renders without AdSense
 * slots. Ad-related Server Components (e.g., `AdSenseGuard`, `AdSenseInFeedGuard`)
 * consult `isNoAdsScope()` via `resolveAdGuard()` and short-circuit to `hidden`
 * — nothing is rendered in the DOM.
 *
 * To make additional pages ad-free, move them under a `(no-ads)` route group
 * that is a descendant of a layout like this one. No per-page code changes
 * are required.
 */
export default function NoAdsLayout({ children }: { children: React.ReactNode }) {
  markNoAdsScope();
  return <>{children}</>;
}
