'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import { RoutePlannerSettings } from './RoutePlannerSettings';
import { RoutePlannerTutorial } from './RoutePlannerTutorial';
import { ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY } from './RoutePlannerTutorialSkipLink';

type Props = {
  locale: Locale;
};

export function RoutePlannerPageContent({ locale }: Props) {
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

  return <RoutePlannerSettings locale={locale} onShowTutorial={() => setShowTutorial(true)} />;
}
