import { Skeleton } from '@/app/[locale]/_components';

import { PracticeLayout } from './PracticeLayout';

/**
 * Inline practice-result fallback used by client-side session components
 * (e.g. `LegalMovesSession`, `RoutePlannerSession`, `SquareColorsChallenge`)
 * while a problem set or result payload is being prepared on the client.
 *
 * This is intentionally NOT the same shape as the server `loading.tsx`
 * fallback for the result route (`PracticeResultLoadingSkeleton`). The
 * client fallback only needs to occupy the inner score panel area while a
 * client-side state transition completes; the surrounding `<PageTitle>` /
 * `<PagePanel>` / `<Breadcrumb>` chrome is already in the DOM at that
 * point, so re-emitting it would double-render. Keep the two skeletons
 * separate.
 */
export function PracticeResultSkeleton() {
  return (
    <PracticeLayout>
      {/* Score display placeholder */}
      <div className="mb-6 text-center flex flex-col items-center">
        <Skeleton className="h-10 w-32 mb-2" />
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Action buttons placeholder */}
      <div className="space-y-4 mt-6">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </PracticeLayout>
  );
}
