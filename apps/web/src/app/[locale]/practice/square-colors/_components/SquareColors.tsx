'use client';

import type { Locale } from '@/app/[locale]/_lib/types';
import { usePersistentSettings } from '@/app/[locale]/practice/_hooks/use-persistent-settings';

import type { PracticeMode } from '../_lib/types';
import { SquareColorsSetup } from './SquareColorsSetup';

type Props = {
  locale: Locale;
};

type SquareColorsLocalSettings = {
  timeLimit: number;
  mode: PracticeMode;
};

const STORAGE_KEY = 'squareColors_settings';
const DEFAULTS: SquareColorsLocalSettings = { timeLimit: 60, mode: 'timed' };

export default function SquareColors({ locale }: Props) {
  const { settings, updateSettings } = usePersistentSettings(STORAGE_KEY, DEFAULTS);

  return (
    <SquareColorsSetup
      locale={locale}
      timeLimit={settings.timeLimit}
      onTimeLimitChange={(timeLimit) => updateSettings({ timeLimit })}
      mode={settings.mode}
      onModeChange={(mode) => updateSettings({ mode })}
    />
  );
}
