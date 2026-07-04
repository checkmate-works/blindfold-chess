import { Divider, PagePanel, PageTitle, Skeleton } from '@/app/[locale]/_components';

import { RecallReviewSkeleton } from './RecallReviewSkeleton';
import { RecallSetupFormSkeleton } from './RecallSetupFormSkeleton';

type Props = {
  /** Real, already-translated title text (`t('title')`) — static across both
   * branches at first paint (it only changes once live move feedback sets it),
   * so there's no "Loading…" flash to avoid the way `games/play` has. */
  title: string;
  /**
   * Whether the request's `pgn`/`moves` search params are present, mirroring
   * `RecallPageClient`'s own branch. `/practice`'s menu links to a bare
   * `/practice/recall` (no query string), which is the setup-form case;
   * a "Recall" deep-link from a finished game carries `pgn`/`moves`.
   */
  hasReview: boolean;
};

/**
 * Suspense fallback for `/practice/recall`, mirroring `RecallPageClient`'s
 * two possible shapes (setup form vs. active review) so a client-side
 * navigation into this route — e.g. from the `/practice` menu, or a "Recall"
 * deep-link — shows a real skeleton instead of a blank gap while the RSC
 * payload streams in. See `games/play/page.tsx`'s `PlaySkeleton` for the
 * sibling pattern this one follows.
 */
export function RecallSkeleton({ title, hasReview }: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-2">
        <PageTitle>{title}</PageTitle>
        {/* Reserves the "?" help-tour trigger's `h-5 w-5` footprint. */}
        <span className="inline-block h-5 w-5" aria-hidden />
      </div>
      <PagePanel>
        {hasReview ? <RecallReviewSkeleton /> : <RecallSetupFormSkeleton />}
        {/* Mirror `PageLayout`'s trailing block — see PageLayout.tsx and
            RecallPageClient's own `!mt-4 space-y-4` wrapper. */}
        <div className="!mt-4 space-y-4">
          <Divider />
          {/* Matches BreadcrumbContent's `density="compact"` nav wrapper
              (`flex min-h-6 items-center`) exactly — not play's breadcrumb
              skeleton, which reserves a taller `default`-density shape that
              doesn't apply here. */}
          <div aria-hidden className="flex min-h-6 items-center">
            <Skeleton disableAnimation className="h-4 w-48" />
          </div>
        </div>
      </PagePanel>
    </div>
  );
}
