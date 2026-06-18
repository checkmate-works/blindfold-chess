import { DashboardCard, DashboardSection, Divider, Skeleton } from '@/app/[locale]/_components';

// Card chips per dashboard section: Challenge(1) / Social(2) / Practice(2) / Account(2).
const SECTION_CHIPS = [1, 2, 2, 2];

/**
 * Loading placeholder for the `/mypage` dashboard, measured against the live
 * page: profile card (avatar + name + action pills), level bar, coin chip,
 * divider, interview banner, activity-heatmap card, and the four dashboard
 * sections (header + card chips). Reuses `DashboardCard` / `DashboardSection`
 * so the sections' container, padding and dividers match exactly.
 */
export function MypageDashboardSkeleton() {
  return (
    <>
      {/* Profile card */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 !rounded-full flex-shrink-0" />
        <div className="min-w-0">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-1 h-4 w-28" />
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-36 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Level progress */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="mt-1 h-3 w-40" />
        <div className="mt-2 flex justify-center">
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      {/* Coin balance chip */}
      <Skeleton className="mt-3 h-[46px] w-full rounded-lg" />

      <Divider />

      {/* Interview banner */}
      <Skeleton className="h-[62px] w-full rounded-lg" />

      {/* Activity heatmap card */}
      <section className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="mb-2 h-5 w-28" />
        <Skeleton className="h-[120px] w-full rounded-md" />
      </section>

      {/* Dashboard sections */}
      <DashboardCard>
        {SECTION_CHIPS.map((chips, i) => (
          <DashboardSection key={i}>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {Array.from({ length: chips }, (_, j) => (
                <Skeleton key={j} className="h-24 w-24 rounded-lg" />
              ))}
            </div>
          </DashboardSection>
        ))}
      </DashboardCard>
    </>
  );
}
