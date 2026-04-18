'use client';

import { useEffect, useRef } from 'react';

import { ADSENSE_PUBLISHER_ID, IS_LOCAL_DEV } from '@/config';

import { useStorageAvailabilityContext } from '@/lib/storage/StorageAvailabilityProvider';

import { AdPlaceholder } from './AdPlaceholder';
import './types';

type AdSenseInFeedProps = {
  slotId: string;
  layoutKey: string;
};

export function AdSenseInFeed({ slotId, layoutKey }: AdSenseInFeedProps) {
  // See `AdSenseDisplay` for rationale — we gate the `<ins>` on the storage
  // probe so the layout doesn't reserve space for an empty ad box when the
  // loader was never injected or was stubbed by an adblocker.
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
    return <AdPlaceholder slot="native-ad" />;
  }

  if (!availability?.all) return null;

  return (
    <div className="max-w-full overflow-hidden">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-slot={slotId}
        data-ad-format="fluid"
        data-ad-layout-key={layoutKey}
      />
    </div>
  );
}
