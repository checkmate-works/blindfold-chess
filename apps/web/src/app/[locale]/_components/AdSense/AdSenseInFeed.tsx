'use client';

import { useEffect, useRef } from 'react';

import { ADSENSE_PUBLISHER_ID, IS_LOCAL_DEV } from '@/config';

import { useStorageAvailabilityContext } from '@/lib/storage/StorageAvailabilityProvider';

import { AdPlaceholder } from './AdPlaceholder';
import { AD_SLOT_DIMENSIONS } from './ad-slot-dimensions';
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

    const tryPush = () => {
      if (pushed.current) return;
      // See `AdSenseDisplay` — skip the push when the no-flash bootstrap
      // marked the page as ads-hidden (sub / grant holder). The
      // `visibilitychange` re-check below covers the case where the user
      // completes a subscription checkout in another tab: when this tab
      // returns to visible the attribute is re-read before the push fires.
      if (document.documentElement.dataset.adsHidden === 'true') return;
      pushed.current = true;

      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Silently fail - ads are non-critical
      }
    };

    tryPush();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tryPush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [availability]);

  if (IS_LOCAL_DEV || !ADSENSE_PUBLISHER_ID) {
    // Wrap the placeholder in `.ad-slot-wrapper` so the no-flash hide rule
    // (in `[locale]/layout.tsx`) applies locally — without the wrapper the
    // CSS selector has no match and the placeholder would stay visible
    // even when the user holds an `ad_free` entitlement, masking what is
    // in fact a working hide.
    return (
      <div className="ad-slot-wrapper" data-ad-slot="native-ad">
        <AdPlaceholder slot="native-ad" />
      </div>
    );
  }

  if (!availability?.all) return null;

  return (
    <div
      className={`ad-slot-wrapper max-w-full overflow-hidden ${AD_SLOT_DIMENSIONS['native-ad'].reserveMinH}`}
      data-ad-slot="native-ad"
    >
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
