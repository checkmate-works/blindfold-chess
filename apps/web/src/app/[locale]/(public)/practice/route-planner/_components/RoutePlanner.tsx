'use client';

import { usePersistentSettings } from '@/app/[locale]/(public)/practice/_hooks/use-persistent-settings';
import type { Locale } from '@/app/[locale]/_lib/types';

import { RoutePlannerPageContent } from './RoutePlannerPageContent';
import { STORAGE_KEY } from './constants';

type Props = {
  locale: Locale;
};

type RoutePlannerLocalSettings = {
  problemCount: number;
  selectedPieces: Record<string, boolean>;
};
const DEFAULTS: RoutePlannerLocalSettings = {
  problemCount: 5,
  selectedPieces: { n: true, b: true, r: true, q: true },
};

export default function RoutePlanner({ locale }: Props) {
  const { settings, updateSettings } = usePersistentSettings(STORAGE_KEY, DEFAULTS);

  return (
    <RoutePlannerPageContent
      locale={locale}
      settings={settings}
      onUpdateSettings={updateSettings}
    />
  );
}
