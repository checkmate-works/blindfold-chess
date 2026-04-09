'use client';

import { TutorialSkipLink as SharedTutorialSkipLink } from '@/app/[locale]/(public)/practice/_components/TutorialSkipLink';
import type { Locale } from '@/app/[locale]/_lib/types';

export const ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY = 'routePlannerTutorialSkipped';

type Props = {
  locale: Locale;
};

export function RoutePlannerTutorialSkipLink({ locale }: Props) {
  return (
    <SharedTutorialSkipLink
      locale={locale}
      storageKey={ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY}
      redirectPath="route-planner"
      translationNamespace="practice.routePlanner.tutorial"
      translationKey="skip"
    />
  );
}
