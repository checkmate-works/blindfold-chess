'use client';

import { useCallback, useState, useTransition } from 'react';

import { Skeleton } from '@/app/[locale]/_components';

import { getLeaderboard } from '../_actions/getLeaderboard';
import type { LeaderboardModule, LeaderboardPeriod, LeaderboardResult } from '../_lib/types';
import { MODULE_KEYS, PAGE_SIZE } from '../_lib/types';
import { LeaderboardFilters } from './LeaderboardFilters';
import { LeaderboardPagination } from './LeaderboardPagination';
import { LeaderboardTable } from './LeaderboardTable';

type Props = {
  locale: string;
  currentUserId: string | null;
  initialData: LeaderboardResult;
  initialModule: LeaderboardModule;
  initialKey: string;
  period: LeaderboardPeriod;
};

export function LeaderboardContainer({
  locale,
  currentUserId,
  initialData,
  initialModule,
  initialKey,
  period,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const [module, setModule] = useState<LeaderboardModule>(initialModule);
  const [settingKey, setSettingKey] = useState<string>(initialKey);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardResult>(initialData);

  const fetchData = useCallback(
    (m: LeaderboardModule, k: string, pg: number) => {
      startTransition(async () => {
        const result = await getLeaderboard(m, k, period, pg);
        setData(result);
      });
    },
    [period]
  );

  const handleModuleChange = useCallback(
    (m: LeaderboardModule) => {
      const newKey = MODULE_KEYS[m][0];
      setModule(m);
      setSettingKey(newKey);
      setPage(1);
      fetchData(m, newKey, 1);
    },
    [fetchData]
  );

  const handleSettingKeyChange = useCallback(
    (k: string) => {
      setSettingKey(k);
      setPage(1);
      fetchData(module, k, 1);
    },
    [module, fetchData]
  );

  const handlePageChange = useCallback(
    (pg: number) => {
      setPage(pg);
      fetchData(module, settingKey, pg);
    },
    [module, settingKey, fetchData]
  );

  const totalPages = Math.ceil(data.totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <LeaderboardFilters
        module={module}
        settingKey={settingKey}
        onModuleChange={handleModuleChange}
        onSettingKeyChange={handleSettingKeyChange}
      />

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
