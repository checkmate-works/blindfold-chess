'use client';

import { useEffect, useState } from 'react';

import type { PracticeMode } from '@blindfold-chess/features/common';

import type { Locale } from '@/app/[locale]/_lib/types';

import { RoutePlannerSettings } from './RoutePlannerSettings';
import { RoutePlannerTutorial } from './RoutePlannerTutorial';
import { ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY } from './RoutePlannerTutorialSkipLink';

type Settings = {
  problemCount: number;
  selectedPieces: Record<string, boolean>;
  mode: PracticeMode;
};

type Props = {
  locale: Locale;
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
};

export function RoutePlannerPageContent({ locale, settings, onUpdateSettings }: Props) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasCheckedTutorial, setHasCheckedTutorial] = useState(false);

  useEffect(() => {
    const skipped = localStorage.getItem(ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY);
    if (!skipped) {
      setShowTutorial(true);
    }
    setHasCheckedTutorial(true);
  }, []);

  if (!hasCheckedTutorial) return null;

  if (showTutorial) {
    return <RoutePlannerTutorial locale={locale} />;
  }

  return (
    <RoutePlannerSettings
      locale={locale}
      problemCount={settings.problemCount}
      selectedPieces={settings.selectedPieces}
      mode={settings.mode}
      onProblemCountChange={(problemCount) => onUpdateSettings({ problemCount })}
      onSelectedPiecesChange={(selectedPieces) => onUpdateSettings({ selectedPieces })}
      onModeChange={(mode) => onUpdateSettings({ mode })}
      onShowTutorial={() => setShowTutorial(true)}
    />
  );
}
