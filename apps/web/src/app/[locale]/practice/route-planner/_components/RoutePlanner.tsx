'use client';

import type { PracticeMode } from '@blindfold-chess/features';

import type { Locale } from '@/app/[locale]/_lib/types';
import { usePersistentSettings } from '@/app/[locale]/practice/_hooks/usePersistentSettings';

import { RoutePlannerPageContent } from './RoutePlannerPageContent';

type Props = {
  locale: Locale;
};

type RoutePlannerLocalSettings = {
  problemCount: number;
  selectedPieces: Record<string, boolean>;
  mode: PracticeMode;
};

export const STORAGE_KEY = 'routePlannerSettings';
const DEFAULTS: RoutePlannerLocalSettings = {
  problemCount: 5,
  selectedPieces: { N: true, B: true, R: true, Q: true },
  mode: 'timed',
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
