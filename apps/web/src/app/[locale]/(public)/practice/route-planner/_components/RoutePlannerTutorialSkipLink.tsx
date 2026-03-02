'use client';

import { TutorialSkipLink } from '@/app/[locale]/(public)/practice/_components/TutorialSkipLink';

export const ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY = 'routePlannerTutorialSkipped';

type Props = {
  onStartTutorial: () => void;
};

export function RoutePlannerTutorialSkipLink({ onStartTutorial }: Props) {
  return (
    <div className="flex justify-center mt-6">
      <TutorialSkipLink
        onClick={onStartTutorial}
        translationNamespace="practice.routePlanner.tutorial"
        translationKey="viewTutorial"
      />
    </div>
  );
}
