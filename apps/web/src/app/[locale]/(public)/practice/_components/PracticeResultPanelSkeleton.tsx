import {
  ExpGainSkeleton,
  RecordSectionSkeleton,
  SignUpBannerSkeleton,
} from '@/app/[locale]/(public)/practice/_components/skeletons';
import { SectionTitle } from '@/app/[locale]/_components';
import { CardLinkSkeleton } from '@/app/[locale]/_components/CardLinkSkeleton';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * The PagePanel-inner skeleton shared by every practice result placeholder:
 * the score summary (heading + accuracy bar + legend + average time), the
 * action buttons, the related-module card, and the leaderboard preview.
 *
 * Mirrors the inner content of `PracticeResultPage` (rendered by all result
 * routes via `createPracticeResultClient`). It deliberately renders NO chrome
 * (PageTitle / PagePanel / Breadcrumb) and returns a fragment of direct blocks
 * so the surrounding `space-y-8` container (the PagePanel itself, or the
 * inline wrapper) drives the vertical rhythm exactly like the real page.
 *
 * Two consumers share this so the challenge → result transition keeps one
 * stable shape:
 *  - `PracticeResultLoadingSkeleton` — the server `loading.tsx` for the result
 *    route, which wraps this in PageTitle + PagePanel + Breadcrumb.
 *  - `PracticeResultSkeleton` — the inline client fallback shown by session
 *    components while finishing / redirecting, rendered inside the session
 *    page's existing PagePanel.
 *
 * Conditional sections (LeaderboardPreview, related-module card) are always
 * reserved because most modules render them and omitting them causes more CLS
 * than slight over-allocation — the same tradeoff documented on the loading
 * skeleton.
 *
 * `ExpGainDisplay` (authenticated) and the slot under it — the
 * sign-up banner (anonymous) or the record section (authenticated, on modules
 * that record to `challenge_results`) — are mutually exclusive by auth state
 * and module-dependent (not every module grants EXP, shows the banner, or
 * keeps records), so they are opt-in via `reserveExp` / `reserveSignUpBanner`
 * / `reserveRecordSection` — the callers set them from the resolved auth
 * state plus per-module config.
 */
type Props = {
  /** Reserve the EXP gain card (between the summary and the action buttons). */
  reserveExp?: boolean;
  /** Reserve the sign-up banner (under the EXP card). */
  reserveSignUpBanner?: boolean;
  /** Reserve the record section (same slot as the banner, for signed-in players). */
  reserveRecordSection?: boolean;
};

export function PracticeResultPanelSkeleton({
  reserveExp = false,
  reserveSignUpBanner = false,
  reserveRecordSection = false,
}: Props = {}) {
  return (
    <>
      {/* PracticeCompleteSummary. `createPracticeResultClient` always sets
          `scoreStats` + `recreationProgress`, so the real summary renders its
          heading + accuracy-bar branch — an h2, a left-aligned progress label,
          the `h-8` SegmentedProgressBar, its two-item legend, and a centered
          average-time line — NOT the big score/total number. Emitted as two
          direct children (h2 + div) to mirror the component's fragment so the
          `space-y-8` rhythm matches. The label text varies per module (e.g.
          accuracy vs recreation progress), so bars are used. */}
      <SectionTitle className="text-2xl font-bold mb-6">
        <span className="inline-block h-7 w-24 bg-muted rounded align-middle animate-pulse" />
      </SectionTitle>

      <div className="mb-6">
        {/* Accuracy / recreation-progress label */}
        <Skeleton className="h-4 w-24 rounded mb-2" />
        {/* SegmentedProgressBar */}
        <Skeleton className="h-8 w-full rounded-lg" />
        {/* Legend: correct / incorrect */}
        <div className="flex justify-between mt-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1 animate-pulse">
              <div className="w-3 h-3 rounded bg-muted" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
        {/* Average time line (centered) */}
        <Skeleton className="h-4 w-40 rounded mt-4 mx-auto" />
      </div>

      {/* ExpGainDisplay placeholder — only reserved for authenticated runs that
          earn EXP (see `reserveExp`). Mirrors the real card (EXP row +
          level/progress); the "Level Up!" badge is rare and not reserved. */}
      {reserveExp && <ExpGainSkeleton className="mt-4" />}

      {/* The auth slot under the EXP card (PracticeComplete's `afterExp`).
          SignUpBanner placeholder — only reserved for anonymous users on modules
          that show it (see `reserveSignUpBanner`). Matches SignUpBannerUI. */}
      {reserveSignUpBanner && <SignUpBannerSkeleton />}

      {/* RecordSection placeholder — the signed-in counterpart of the banner
          slot, for modules that record to challenge_results. */}
      {reserveRecordSection && <RecordSectionSkeleton />}

      {/* Action buttons (Try Again / Change Settings, etc.) */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* Related module CardLink (most modules render one). Rendered BEFORE
          LeaderboardPreview to match the real flow: PracticeComplete (which
          ends with the related-module card) precedes LeaderboardPreview in
          createPracticeResultClient. */}
      <CardLinkSkeleton />

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
