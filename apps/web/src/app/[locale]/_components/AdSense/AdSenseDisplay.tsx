'use client';

import { useEffect, useRef } from 'react';

import { ADSENSE_PUBLISHER_ID, IS_LOCAL_DEV } from '@/config';

import { useStorageAvailabilityContext } from '@/lib/storage/StorageAvailabilityProvider';

import { AdPlaceholder } from './AdPlaceholder';
import './types';

type AdSenseDisplayProps = {
  slotId: string;
  slot: 'content-middle' | 'content-bottom';
  className?: string;
};

export function AdSenseDisplay({ slotId, slot, className }: AdSenseDisplayProps) {
  // Gate the `<ins>` markup on the same storage probe that gates the
  // adsbygoogle loader itself (see `GoogleScripts`). Two failure modes make
  // this necessary even though `push({})` is a silent no-op when the loader
  // was skipped:
  //   - The wrapper `<div>` below reserves layout space; an empty `<ins>`
  //     inside it produces a visible empty column.
  //   - Some adblockers replace `window.adsbygoogle` with a stub that
  //     swallows `.push()` — same empty-box result.
  // By reading the availability context we return `null` in exactly the
  // cases where the loader wasn't injected, keeping gating colocated with
  // feature detection.
  const availability = useStorageAvailabilityContext();
  const pushed = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (IS_LOCAL_DEV || !ADSENSE_PUBLISHER_ID) return;
    if (!availability?.all) return;

    // Returns `true` when no further action is needed (pushed, already
    // pushed, or intentionally skipped); `false` when the push was deferred
    // and should be retried once the container has a real width.
    const tryPush = (): boolean => {
      if (pushed.current) return true;
      // Respect the `bfc_ads_hidden` cookie surfaced as
      // `<html data-ads-hidden="true">` by the inline no-flash bootstrap in
      // `[locale]/layout.tsx`. Skipping `push()` here prevents a network
      // request to Google for ads we are about to CSS-hide anyway.
      //
      // Re-checked on every `visibilitychange` to `visible` so a subscription
      // completed in another tab takes effect without a reload: if the
      // entitlement cookie flipped the attribute to 'true' while this tab
      // was backgrounded, the queued push is skipped on return. If the push
      // has already fired, we cannot un-fire it — this is a one-shot
      // correction for not-yet-pushed slots only.
      if (document.documentElement.dataset.adsHidden === 'true') return true;

      // Responsive units (`data-ad-format="auto"` + full-width-responsive)
      // size themselves from the container's width. If that width is 0 at
      // push time — off-screen, a collapsed flex/grid parent, or mid RSC
      // soft-navigation — AdSense throws "No slot size for availableWidth=0"
      // asynchronously inside its own setTimeout, so the try/catch below
      // cannot catch it and it surfaces as an unhandled error. Defer the push
      // until the container is laid out with a real width (ResizeObserver
      // below retries). Reading offsetWidth forces a synchronous layout, so
      // the value reflects the committed layout, not a stale frame.
      const el = containerRef.current;
      if (!el || el.offsetWidth === 0) return false;
      pushed.current = true;

      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Silently fail - ads are non-critical
      }
      return true;
    };

    // If the container has no width yet, watch for it to gain one and push
    // then. This is the actual fix for the availableWidth=0 crash.
    let observer: ResizeObserver | null = null;
    if (!tryPush() && containerRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (tryPush()) observer?.disconnect();
      });
      observer.observe(containerRef.current);
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tryPush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }, [availability]);

  if (IS_LOCAL_DEV || !ADSENSE_PUBLISHER_ID) {
    return <AdPlaceholder slot={slot} />;
  }

  // `null` during SSR / first client render and when any storage mechanism
  // is blocked. Server and first-client render match (both emit nothing),
  // so there is no hydration mismatch.
  if (!availability?.all) return null;

  return (
    <div ref={containerRef} className={`mx-auto max-w-full overflow-hidden ${className ?? ''}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
