'use client';

import type { PracticeMode } from '@blindfold-chess/features/common';

import { usePersistentSettings } from '@/app/[locale]/(public)/practice/_hooks/use-persistent-settings';
import type { Locale } from '@/app/[locale]/_lib/types';

import QuadrantQuizSetup from './QuadrantQuizSetup';

type Props = {
  locale: Locale;
};

type BoardOrientation = 'white' | 'black' | 'random';

type QuadrantLocalSettings = {
  problemCount: number;
  orientation: BoardOrientation;
  mode: PracticeMode;
};

const STORAGE_KEY = 'quadrantAnchors_settings';
const DEFAULTS: QuadrantLocalSettings = {
  problemCount: 10,
  orientation: 'white',
  mode: 'timed',
};

export default function QuadrantQuiz({ locale }: Props) {
  const { settings, updateSettings } = usePersistentSettings(STORAGE_KEY, DEFAULTS);

  return (
    <QuadrantQuizSetup
      locale={locale}
      problemCount={settings.problemCount}
      orientation={settings.orientation}
      mode={settings.mode}
      onProblemCountChange={(problemCount) => updateSettings({ problemCount })}
      onOrientationChange={(orientation) => updateSettings({ orientation })}
      onModeChange={(mode) => updateSettings({ mode })}
    />
  );
}
