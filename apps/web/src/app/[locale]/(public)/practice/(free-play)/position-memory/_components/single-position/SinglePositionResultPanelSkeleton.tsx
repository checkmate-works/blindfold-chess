import { BoardSkeleton } from '@/app/_components';

import { SectionTitle } from '@/app/[locale]/_components';

type Props = {
  /**
   * Static labels rendered as real (localized) text, passed by the caller so
   * this stays a pure presentational component usable from both the server
   * `loading.tsx` (strings via `getTranslations`) and the client-side session
   * finish fallback (strings via `useSafeTranslations`).
   */
  labels: {
    result: string;
    original: string;
    yourRecreation: string;
    requiredKnowledge: string;
  };
  /** Reserve the EXP card (authenticated, EXP-eligible runs). */
  reserveExp?: boolean;
  /** Reserve the sign-up banner (anonymous users). */
  reserveSignUpBanner?: boolean;
};

/**
 * The PagePanel-inner skeleton for the single-position result (`[id]` and custom
 * `[token]`). Mirrors `SinglePositionResult`'s body — result heading, accuracy,
 * progress bar, the two-board comparison, the EXP card / sign-up banner, the
 * three action buttons, and the required-knowledge grid — with NO chrome
 * (PageTitle / PagePanel / Breadcrumb), so the surrounding container drives the
 * rhythm.
 *
 * Shared by three consumers so the session → result transition keeps one stable
 * shape:
 *  - `SinglePositionResultLoadingSkeleton` — the server route loading skeleton
 *    (wraps this in PagePanel + breadcrumb).
 *  - `SinglePositionResultSkeleton` — the inline client finish fallback shown by
 *    the single/custom session while saving + redirecting (rendered inside the
 *    session page's existing PageLayout panel).
 *
 * `ExpGainDisplay` (authenticated) and `SignUpBanner` (anonymous) occupy the
 * same slot above the buttons and are mutually exclusive by auth state; the
 * caller reserves exactly one based on the resolved user.
 */
export function SinglePositionResultPanelSkeleton({
  labels,
  reserveExp = false,
  reserveSignUpBanner = false,
}: Props) {
  return (
    <div className="space-y-6">
      <SectionTitle>{labels.result}</SectionTitle>

      {/* Accuracy heading — dynamic % → bar. */}
      <div className="flex justify-center">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      </div>

      {/* SegmentedProgressBar (common, non-skipped case). */}
      <div>
        <div className="h-4 w-40 bg-muted rounded mb-2 animate-pulse" />
        <div className="h-3 w-full bg-muted rounded-full animate-pulse" />
      </div>

      {/* Board comparison: Original | Your Recreation. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">{labels.original}</p>
          <div className="w-full max-w-xs mx-auto">
            <BoardSkeleton />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">{labels.yourRecreation}</p>
          <div className="w-full max-w-xs mx-auto">
            <BoardSkeleton />
          </div>
        </div>
      </div>

      {/* ExpGainDisplay (authenticated) / SignUpBanner (anonymous) — same slot. */}
      {reserveExp && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">EXP</span>
            <span className="inline-block h-5 w-20 bg-muted rounded animate-pulse" />
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-block h-4 w-12 bg-muted rounded animate-pulse" />
              <span className="inline-block h-3 w-8 bg-muted rounded animate-pulse" />
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-muted h-2 w-1/3 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      )}
      {reserveSignUpBanner && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="w-full">
              <div className="h-5 w-40 bg-muted rounded animate-pulse" />
              <div className="mt-2 h-4 w-56 max-w-full bg-muted rounded animate-pulse" />
            </div>
            <div className="h-9 w-28 flex-shrink-0 bg-muted rounded-md animate-pulse" />
          </div>
        </div>
      )}

      {/* Action buttons: Try Again / Back to List / Analyze on Lichess. */}
      <div className="space-y-3">
        <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
        <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
        <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
      </div>

      {/* Required Knowledge — SectionTitle + 2-card grid. */}
      <div className="mt-8 space-y-4">
        <SectionTitle>{labels.requiredKnowledge}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-6 bg-card rounded-md border border-border animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 bg-muted rounded flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-5 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
