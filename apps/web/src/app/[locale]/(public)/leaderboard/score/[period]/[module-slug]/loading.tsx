import { PagePanel, Skeleton } from '@/app/[locale]/_components';

/**
 * Loading skeleton for the score leaderboard middle hub (module-filtered
 * grid). Structurally identical to the parent score top page skeleton —
 * only the card grid entry count changes at render time, not the DOM
 * structure, so the same topology works for both.
 *
 * The SignUpBanner placeholder uses the same `data-banner-placeholder`
 * marker as the parent route — the layout's inline CSS rule hides it for
 * authenticated users, guaranteeing zero CLS in both auth states.
 */
export default function ScoreLeaderboardModuleHubLoading() {
  return (
    <PagePanel>
      {/* SectionTitle */}
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />

      {/* SignUpBanner fallback (hidden when authenticated) */}
      <div
        data-banner-placeholder
        className="h-24 rounded-lg border border-primary/30 bg-primary/5 sm:h-20"
      />

      {/* LeaderboardTabs */}
      <div className="flex rounded-lg bg-secondary p-1">
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
      </div>

      {/* PeriodTabs */}
      <div className="flex rounded-lg bg-secondary p-1">
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
      </div>

      {/* ModuleFilter */}
      <div className="flex rounded-lg bg-secondary p-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-10 flex-1 rounded-md" />
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </PagePanel>
  );
}
