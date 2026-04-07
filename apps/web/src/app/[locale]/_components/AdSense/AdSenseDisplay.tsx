'use client';

import { useEffect, useRef } from 'react';

import { ADSENSE_PUBLISHER_ID, IS_LOCAL_DEV } from '@/config';

import { AdPlaceholder } from './AdPlaceholder';
import './types';

type AdSenseDisplayProps = {
  slotId: string;
  slot: 'content-middle' | 'content-bottom';
  className?: string;
};

export function AdSenseDisplay({ slotId, slot, className }: AdSenseDisplayProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (IS_LOCAL_DEV || !ADSENSE_PUBLISHER_ID) return;
    if (pushed.current) return;
    pushed.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Silently fail - ads are non-critical
    }
  }, []);

  if (IS_LOCAL_DEV || !ADSENSE_PUBLISHER_ID) {
    return <AdPlaceholder slot={slot} />;
  }

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={`ca-${ADSENSE_PUBLISHER_ID}`}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
