import { PracticeResultLoadingSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultLoadingSkeleton';

/**
 * Shared `loading.tsx` body for challenge result pages. Challenge runs award
 * EXP and show the record comparison (authenticated) or the sign-up banner
 * (anonymous); reserve the matching blocks so the result paint does not shift.
 *
 * Modules whose result page reserves a different block (quadrants: no sign-up
 * banner; route-planner: custom skeleton) keep their own `loading.tsx`.
 */
export default function ChallengeResultLoading() {
  return <PracticeResultLoadingSkeleton grantsExp showsSignUpBanner showsRecordSection />;
}
