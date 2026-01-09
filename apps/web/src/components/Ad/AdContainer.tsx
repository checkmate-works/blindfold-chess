'use client';

import { isAdsSystemEnabled } from '@/lib/ads/config';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { Ad, type AdProps } from './Ad';

export function AdContainer(props: AdProps) {
  const { preferences } = useGamePreferences();

  if (!isAdsSystemEnabled()) {
    return null;
  }

  if (!preferences.adsEnabled) {
    return null;
  }

  return <Ad {...props} />;
}
