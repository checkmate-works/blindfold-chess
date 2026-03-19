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
  initialPeriod: LeaderboardPeriod;
};

export function LeaderboardContainer({
  locale,
  currentUserId,
  initialData,
  initialModule,
  initialKey,
  initialPeriod,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const [module, setModule] = useState<LeaderboardModule>(initialModule);
  const [settingKey, setSettingKey] = useState<string>(initialKey);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardResult>(initialData);

  const fetchData = useCallback(
    (m: LeaderboardModule, k: string, p: LeaderboardPeriod, pg: number) => {
      startTransition(async () => {
        const result = await getLeaderboard(m, k, p, pg);
        setData(result);
      });
    },
    []
  );

  const handlePeriodChange = useCallback(
    (p: LeaderboardPeriod) => {
      setPeriod(p);
      setPage(1);
      fetchData(module, settingKey, p, 1);
    },
    [module, settingKey, fetchData]
  );

  const handleModuleChange = useCallback(
    (m: LeaderboardModule) => {
      const newKey = MODULE_KEYS[m][0];
      setModule(m);
      setSettingKey(newKey);
      setPage(1);
      fetchData(m, newKey, period, 1);
    },
    [period, fetchData]
  );

  const handleSettingKeyChange = useCallback(
    (k: string) => {
      setSettingKey(k);
      setPage(1);
      fetchData(module, k, period, 1);
    },
    [module, period, fetchData]
  );

  const handlePageChange = useCallback(
    (pg: number) => {
      setPage(pg);
      fetchData(module, settingKey, period, pg);
    },
    [module, settingKey, period, fetchData]
  );

  const totalPages = Math.ceil(data.totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <LeaderboardFilters
        period={period}
        module={module}
        settingKey={settingKey}
        onPeriodChange={handlePeriodChange}
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
