import { getOptionalUser } from '@/lib/auth';

import { LeaderboardCard } from '.';
import { getUserRanks } from '../_actions/getUserRanks';
import {
  ALL_LEADERBOARD_ENTRIES,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type ModuleFilterValue,
  type UserRankInfo,
} from '../_lib/types';

type Props = {
  locale: string;
  period: LeaderboardPeriod;
  moduleFilter: ModuleFilterValue;
};

function entryKey(entry: LeaderboardEntry): string {
  return `${entry.module}:${entry.key}`;
}

export async function LeaderboardTopContent({ locale, period, moduleFilter }: Props) {
  // Shares the leaderboard layout's Auth round-trip via React.cache.
  const user = await getOptionalUser();
  const currentUserId = user?.id ?? null;

  let userRanks: UserRankInfo[] = [];
  if (currentUserId) {
    userRanks = await getUserRanks(currentUserId, period);
  }

  const rankMap = new Map(userRanks.map((r) => [entryKey(r), r.rank]));

  const filteredEntries =
    moduleFilter === 'all'
      ? ALL_LEADERBOARD_ENTRIES
      : ALL_LEADERBOARD_ENTRIES.filter((entry) => entry.module === moduleFilter);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filteredEntries.map((entry) => (
        <LeaderboardCard
          key={entryKey(entry)}
          locale={locale}
          module={entry.module}
          settingKey={entry.key}
          period={period}
          rank={currentUserId ? (rankMap.get(entryKey(entry)) ?? null) : null}
        />
      ))}
    </div>
  );
}
