import { markNoAdsScope } from '@/lib/ads/no-ads-scope';

/**
 * Ad-free scope layout.
 *
 * Any page placed under this `(no-ads)` route group renders without ad
 * slots. Ad-related Server Components (e.g., `AdSlot`, and any in-feed slot
 * consumers' inline guard) consult `isNoAdsScope()` and short-circuit to
 * nothing being rendered in the DOM.
 *
 * To make additional pages ad-free, move them under a `(no-ads)` route group
 * that is a descendant of a layout like this one. No per-page code changes
 * are required.
 */
export default function NoAdsLayout({ children }: { children: React.ReactNode }) {
  markNoAdsScope();
  return <>{children}</>;
}
