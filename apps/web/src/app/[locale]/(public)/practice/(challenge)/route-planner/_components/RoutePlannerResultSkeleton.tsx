'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

import { RoutePlannerResultPanelSkeleton } from '../result/RoutePlannerResultPanelSkeleton';

/**
 * Inline result fallback shown by `RoutePlannerChallengeSession` while a
 * finished run is being saved and the redirect to the result route is in
 * flight. It renders the SAME inner panel as the result route's server
 * `loading.tsx` (both share `RoutePlannerResultPanelSkeleton`), minus the chrome
 * — the session page's PageTitle / PagePanel / Breadcrumb are already in the DOM
 * at this point. Sharing the route-planner-specific panel (with the Problem
 * Details list) keeps the session → result-loading → result sequence on one
 * stable shape instead of jumping from the generic `PracticeResultSkeleton` to
 * the route-planner result layout.
 */
export function RoutePlannerResultSkeleton() {
  const tPractice = useTranslations('practice');
  const { user, isLoading } = useAuth();

  // Authenticated runs land on the EXP card; anonymous runs land on the sign-up
  // banner. While auth is still resolving, reserve neither (this window is
  // brief and guessing wrong would itself shift).
  const reserveExp = !isLoading && !!user;
  const reserveSignUpBanner = !isLoading && !user;

  return (
    <div className="space-y-8">
      <RoutePlannerResultPanelSkeleton
        labels={{
          result: tPractice('result'),
          accuracy: tPractice('accuracy'),
          averageTime: tPractice('averageTime'),
          problemDetails: tPractice('problemDetails'),
          relatedLearning: tPractice('relatedLearning'),
        }}
        reserveExp={reserveExp}
        reserveSignUpBanner={reserveSignUpBanner}
      />
    </div>
  );
}
