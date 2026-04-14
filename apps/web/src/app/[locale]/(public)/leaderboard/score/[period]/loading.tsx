import { PagePanel, Skeleton } from '@/app/[locale]/_components';

/**
 * Loading skeleton for the canonical score leaderboard top page. Mirrors the
 * resolved DOM topology exactly (SectionTitle → SignUpBanner (conditional)
 * → Score/Exp tabs → Period tabs → Module filter → card grid) so there is no
 * layout shift when the real page resolves.
 *
 * Wrapper classes on the segmented controls (`flex rounded-lg bg-secondary p-1`)
 * are copied verbatim from `LeaderboardTabs.tsx`, `PeriodTabs.tsx`, and
 * `ModuleFilter.tsx` so the placeholder occupies the same box.
 *
 * The `[data-banner-placeholder]` marker on the SignUpBanner stub is hidden
 * by an inline CSS rule in `leaderboard/layout.tsx` when the layout's auth
 * check has already resolved to `authenticated`. This guarantees zero CLS
 * for both anonymous (banner shows → real banner swaps in at same box) and
 * logged-in users (placeholder hidden → no space reserved → real page never
 * renders a banner either).
 */
export default function ScoreLeaderboardPeriodLoading() {
  return (
    <PagePanel>
      {/* SectionTitle */}
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />

      {/*
        SignUpBanner fallback — fixed height matching SignUpBannerUI's
        resolved box (`rounded-lg border border-primary/30 bg-primary/5
        p-4 sm:p-6`). Auto-hidden for authenticated users via the layout's
        scoped inline style rule.
      */}
      <div
        data-banner-placeholder
        className="h-24 rounded-lg border border-primary/30 bg-primary/5 sm:h-20"
      />

      {/* LeaderboardTabs (2 buttons) */}
      <div className="flex rounded-lg bg-secondary p-1">
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
      </div>

      {/* PeriodTabs (3 buttons) */}
      <div className="flex rounded-lg bg-secondary p-1">
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
      </div>

      {/* ModuleFilter (7 buttons: all + 6 modules) */}
      <div className="flex rounded-lg bg-secondary p-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-10 flex-1 rounded-md" />
        ))}
      </div>

      {/* Card grid (6 cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </PagePanel>
  );
}
