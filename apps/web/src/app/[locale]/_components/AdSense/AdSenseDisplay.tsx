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

  useEffect(() => {
    if (IS_LOCAL_DEV || !ADSENSE_PUBLISHER_ID) return;
    if (!availability?.all) return;
    if (pushed.current) return;
    pushed.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Silently fail - ads are non-critical
    }
  }, [availability]);

  if (IS_LOCAL_DEV || !ADSENSE_PUBLISHER_ID) {
    return <AdPlaceholder slot={slot} />;
  }

  // `null` during SSR / first client render and when any storage mechanism
  // is blocked. Server and first-client render match (both emit nothing),
  // so there is no hydration mismatch.
  if (!availability?.all) return null;

  return (
    <div className={`mx-auto max-w-full overflow-hidden ${className ?? ''}`}>
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
