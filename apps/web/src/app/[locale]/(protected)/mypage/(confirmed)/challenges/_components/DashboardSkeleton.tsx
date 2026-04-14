import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/** KPIカード1枚分のスケルトン（StatsCardと同じサイズ） */
function StatsCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

/** スコアトレンドチャートのスケルトン（ScoreChartのResponsiveContainerと同じ高さ） */
export function ScoreChartSkeleton() {
  return <Skeleton className="h-[250px] w-full rounded-lg" />;
}

/** セッション履歴テーブルのスケルトン（ヘッダー＋5行分） */
function SessionHistoryTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 sm:px-3">
              <Skeleton className="h-4 w-16" />
            </th>
            <th className="text-right py-2 px-2 sm:px-3">
              <Skeleton className="h-4 w-12 ml-auto" />
            </th>
            <th className="text-right py-2 px-2 sm:px-3">
              <Skeleton className="h-4 w-12 ml-auto" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 px-2 sm:px-3">
                <Skeleton className="h-4 w-32" />
              </td>
              <td className="py-2 px-2 sm:px-3">
                <Skeleton className="h-4 w-8 ml-auto" />
              </td>
              <td className="py-2 px-2 sm:px-3">
                <Skeleton className="h-4 w-8 ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 期間セレクターのスケルトン */
function PeriodSelectorSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Skeleton className="w-full sm:w-64 h-[38px] rounded-lg" />
      <Skeleton className="w-full sm:w-48 h-[38px] rounded-lg" />
    </div>
  );
}

/** コンテンツ部分のスケルトン（セレクターを除く） */
export function DashboardContentSkeleton() {
  return (
    <>
      {/* KPIカード */}
      <div>
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
      </div>

      {/* スコアトレンドチャート */}
      <div className="min-w-0">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="mt-4">
          <ScoreChartSkeleton />
        </div>
      </div>

      {/* セッション履歴テーブル */}
      <div>
        <Skeleton className="h-6 w-28 mb-4" />
        <div className="mt-4">
          <SessionHistoryTableSkeleton />
        </div>
      </div>
    </>
  );
}

/** ダッシュボード全体のスケルトン（セレクター含む） */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PeriodSelectorSkeleton />
      <DashboardContentSkeleton />
    </div>
  );
}
