'use client';

import {
  ADSENSE_INFEED_LAYOUT_KEY_DESKTOP,
  ADSENSE_INFEED_LAYOUT_KEY_MOBILE,
  ADSENSE_SLOT_INFEED_DESKTOP,
  ADSENSE_SLOT_INFEED_MOBILE,
  IS_LOCAL_DEV,
} from '@/config';

import { AdSenseInFeed } from '@/app/[locale]/_components/AdSense';
import { useIsDesktop } from '@/app/[locale]/_hooks/use-media-query';

/**
 * Conditionally renders the correct AdSense in-feed ad based on viewport size.
 *
 * Uses `useMediaQuery` instead of CSS show/hide to prevent AdSense from calling
 * `push()` on a hidden (0-width) element, which causes "Fluid responsive ads
 * must be at least 250px wide" errors.
 *
 * During SSR and before hydration, renders nothing (ads are non-critical).
 */
export function ResponsiveAdSlot() {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    if (!IS_LOCAL_DEV && (!ADSENSE_SLOT_INFEED_DESKTOP || !ADSENSE_INFEED_LAYOUT_KEY_DESKTOP)) {
      return null;
    }
    return (
      <AdSenseInFeed
        slotId={ADSENSE_SLOT_INFEED_DESKTOP ?? ''}
        layoutKey={ADSENSE_INFEED_LAYOUT_KEY_DESKTOP ?? ''}
      />
    );
  }

  if (!IS_LOCAL_DEV && (!ADSENSE_SLOT_INFEED_MOBILE || !ADSENSE_INFEED_LAYOUT_KEY_MOBILE)) {
    return null;
  }
  return (
    <AdSenseInFeed
      slotId={ADSENSE_SLOT_INFEED_MOBILE ?? ''}
      layoutKey={ADSENSE_INFEED_LAYOUT_KEY_MOBILE ?? ''}
    />
  );
}
