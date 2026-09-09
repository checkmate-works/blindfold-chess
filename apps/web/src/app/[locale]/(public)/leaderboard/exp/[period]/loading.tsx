import { TabsSkeleton } from '@/app/[locale]/(public)/leaderboard/_components/TabsSkeleton';
import { PagePanel } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Loading skeleton for the canonical exp leaderboard page. Mirrors the
 * resolved DOM: SectionTitle + Score/Exp tabs + Period tabs + table
 * (header + 50 rows) + back link.
 */
export default function ExpLeaderboardPeriodLoading() {
  return (
    <PagePanel>
      {/* SectionTitle */}
      <Skeleton className="h-8 w-56 rounded" />

      {/* LeaderboardTabs */}
      <TabsSkeleton segments={2} />

      {/* PeriodTabs */}
      <TabsSkeleton segments={3} />

      {/* Table: header + 50 rows */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="h-10 bg-muted" />
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="h-12 border-t border-border" />
        ))}
      </div>

      {/* Back link */}
      <div className="mt-4 text-center">
        <div className="mx-auto h-4 w-24 rounded bg-muted" />
      </div>
    </PagePanel>
  );
}
