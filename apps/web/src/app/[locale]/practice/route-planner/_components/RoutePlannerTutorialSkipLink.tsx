'use client';

import { useTranslations } from 'next-intl';

export const ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY = 'routePlannerTutorialSkipped';

type Props = {
  onStartTutorial: () => void;
};

export function RoutePlannerTutorialSkipLink({ onStartTutorial }: Props) {
  const t = useTranslations('practice.routePlanner.tutorial');

  return (
    <div className="flex justify-center mt-6">
      <button
        onClick={onStartTutorial}
        className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
      >
        {t('viewTutorial')}
      </button>
    </div>
  );
}
