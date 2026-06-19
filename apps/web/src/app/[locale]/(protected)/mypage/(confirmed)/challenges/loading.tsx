import { ChallengesLoadingFallback } from './_components/ChallengesLoadingFallback';

/**
 * Pending UI for client-side navigations to `/mypage/challenges`. The hard-load
 * / refresh case is handled by the `(protected)` layout's route-aware gate
 * fallback, which renders the same {@link ChallengesLoadingFallback}.
 */
export default function Loading() {
  return <ChallengesLoadingFallback />;
}
