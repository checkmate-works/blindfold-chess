import {
  ExpGainSkeleton,
  RecordSectionSkeleton,
  SignUpBannerSkeleton,
} from '@/app/[locale]/(public)/practice/_components/skeletons';
import { SectionTitle } from '@/app/[locale]/_components';
import { CardLinkSkeleton } from '@/app/[locale]/_components/CardLinkSkeleton';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

type Props = {
  /**
   * Static labels rendered as real (localized) text. Passed in by the caller so
   * this stays a pure presentational component usable from both the server
   * `loading.tsx` (strings via `getTranslations`) and the client-side session
   * fallback (strings via `useSafeTranslations`).
   */
  labels: {
    result: string;
    accuracy: string;
    averageTime: string;
    problemDetails: string;
    relatedLearning: string;
  };
  /**
   * Reserve space for the EXP gain card (rendered between the summary and the
   * Problem Details on the real page). Only authenticated runs earn EXP, so the
   * caller sets this from auth state to avoid an empty card for anonymous users.
   */
  reserveExp?: boolean;
  /**
   * Reserve space for the sign-up banner (rendered under the EXP card, above
   * the Problem Details). Only anonymous users see it, so it is the
   * auth-state mirror of `reserveExp`.
   */
  reserveSignUpBanner?: boolean;
  /**
   * Reserve space for the record section — the signed-in occupant of the
   * banner's slot (route-planner records to `challenge_results`).
   */
  reserveRecordSection?: boolean;
};

/**
 * The PagePanel-inner skeleton for the route-planner result page. Unlike the
 * shared `PracticeResultPanelSkeleton`, route-planner renders a Problem Details
 * list between the score summary and the action buttons and a 2-card related
 * grid, so it needs its own inner shape (see `RoutePlannerResultLoadingSkeleton`
 * for the full rationale).
 *
 * Shared by two consumers so the challenge → result transition keeps one stable
 * shape (mirroring the `PracticeResultPanelSkeleton` precedent):
 *  - `RoutePlannerResultLoadingSkeleton` — the server `loading.tsx` for the
 *    result route, which wraps this in PageTitle + PagePanel + Breadcrumb.
 *  - `RoutePlannerResultSkeleton` — the inline client fallback shown by the
 *    challenge session while finishing / redirecting, rendered inside the
 *    session page's existing PagePanel.
 *
 * Renders NO chrome (PageTitle / PagePanel / Breadcrumb) and returns a fragment
 * of direct blocks so the surrounding `space-y-8` container drives the vertical
 * rhythm exactly like the real page.
 */
export function RoutePlannerResultPanelSkeleton({
  labels,
  reserveExp = false,
  reserveSignUpBanner = false,
  reserveRecordSection = false,
}: Props) {
  return (
    <>
      {/* PracticeCompleteSummary — heading + accuracy bar + legend + average time.
          The labels are static i18n, so render real text; only the dynamic
          bar/legend/value are placeholders. */}
      <SectionTitle className="text-2xl font-bold mb-6">{labels.result}</SectionTitle>

      <div className="mb-6">
        <p className="text-sm font-medium text-muted-foreground mb-2 text-left">
          {labels.accuracy}
        </p>
        {/* SegmentedProgressBar: full-width h-8 bar + two-item legend */}
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="flex justify-between mt-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1 animate-pulse">
              <div className="w-3 h-3 rounded bg-muted" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
        {/* Average Time line */}
        <p className="text-sm text-center text-muted-foreground mt-4">
          {labels.averageTime}:{' '}
          <span className="inline-block h-3 w-12 bg-muted rounded align-middle animate-pulse" />
        </p>
      </div>

      {/* ExpGainDisplay placeholder — only authenticated runs earn EXP. Mirrors
          the real card (EXP row + level/progress); the "Level Up!" badge is rare
          and intentionally not reserved. The "EXP" label is a literal, not i18n. */}
      {reserveExp && <ExpGainSkeleton className="mt-4" />}

      {/* The auth slot under the EXP card (PracticeComplete's `afterExp`):
          sign-up banner for anonymous users, record section for signed-in
          players. Sits ABOVE the Problem Details, where the real page puts it. */}
      {reserveSignUpBanner && <SignUpBannerSkeleton />}
      {reserveRecordSection && <RecordSectionSkeleton />}

      {/* Problem Details: heading (static i18n) + collapsed result rows */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-muted-foreground mb-4">
          {labels.problemDetails}
        </h3>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border p-3 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 bg-muted rounded" />
                <div className="h-4 w-6 bg-muted rounded" />
                <div className="h-5 w-5 bg-muted rounded" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
              <div className="h-4 w-8 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons (Try Again / More Practice) */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* Related Learning: SectionTitle (static i18n) + 2-card grid (md:grid-cols-3) */}
      <div className="space-y-3">
        <SectionTitle>{labels.relatedLearning}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <CardLinkSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* LeaderboardPreview — header + 5-row table (rank | name | score) */}
      <div className="space-y-3">
        <SectionTitle>
          <span className="inline-block h-5 md:h-6 w-40 bg-muted rounded align-middle animate-pulse" />
        </SectionTitle>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="h-10 bg-muted" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-t border-border px-4 py-3 animate-pulse"
            >
              <div className="h-4 w-6 bg-muted rounded" />
              <div className="h-4 flex-1 bg-muted rounded" />
              <div className="h-4 w-12 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
