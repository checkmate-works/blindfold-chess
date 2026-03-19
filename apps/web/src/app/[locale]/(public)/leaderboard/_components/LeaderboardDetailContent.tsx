'use client';

import { useCallback, useState, useTransition } from 'react';

import { useTranslations } from 'next-intl';

import { SectionTitle, Skeleton } from '@/app/[locale]/_components';

import { getLeaderboard } from '../_actions/getLeaderboard';
import type { LeaderboardModule, LeaderboardPeriod, LeaderboardResult } from '../_lib/types';
import { PAGE_SIZE } from '../_lib/types';
import { LeaderboardPagination } from './LeaderboardPagination';
import { LeaderboardTable } from './LeaderboardTable';

type Props = {
  locale: string;
  period: LeaderboardPeriod;
  module: LeaderboardModule;
  settingKey: string;
  currentUserId: string | null;
  data: LeaderboardResult;
  currentPage: number;
};

export function LeaderboardDetailContent({
  locale,
  period,
  module,
  settingKey,
  currentUserId,
  data: initialData,
  currentPage: initialPage,
}: Props) {
  const t = useTranslations('leaderboard');
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<LeaderboardResult>(initialData);

  const title = t(`cardTitle.${module}.${settingKey}`);
  const periodLabel = t(`period.${period}`);
  const totalPages = Math.ceil(data.totalCount / PAGE_SIZE);

  const handlePageChange = useCallback(
    (pg: number) => {
      setPage(pg);
      startTransition(async () => {
        const result = await getLeaderboard(module, settingKey, period, pg);
        setData(result);
      });
    },
    [module, settingKey, period]
  );

  return (
    <div className="space-y-6">
      <SectionTitle>
        {title}
        <span className="ml-2 text-sm font-normal text-muted-foreground">({periodLabel})</span>
      </SectionTitle>

      <div className={`transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <LeaderboardTable
              rows={data.rows}
              currentUserId={currentUserId}
              currentUserRank={data.currentUserRank}
              locale={locale}
            />
            <LeaderboardPagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={data.totalCount}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
