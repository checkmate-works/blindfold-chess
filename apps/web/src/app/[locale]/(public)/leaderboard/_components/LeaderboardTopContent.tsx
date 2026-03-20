import { createClient } from '@/lib/supabase/server';

import { SectionTitle } from '@/app/[locale]/_components';

import { LeaderboardCard } from '.';
import { getUserRanks } from '../_actions/getUserRanks';
import {
  ALL_LEADERBOARD_ENTRIES,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type ModuleFilterValue,
  TOP_RANK_THRESHOLD,
  type UserRankInfo,
} from '../_lib/types';

type Props = {
  locale: string;
  period: LeaderboardPeriod;
  moduleFilter: ModuleFilterValue;
  yourRankedTitle: string;
  allLeaderboardsTitle: string;
};

function entryKey(entry: LeaderboardEntry): string {
  return `${entry.module}:${entry.key}`;
}

export async function LeaderboardTopContent({
  locale,
  period,
  moduleFilter,
  yourRankedTitle,
  allLeaderboardsTitle,
}: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  let userRanks: UserRankInfo[] = [];
  if (currentUserId) {
    userRanks = await getUserRanks(currentUserId, period);
  }

  const rankMap = new Map(userRanks.map((r) => [entryKey(r), r.rank]));

  const rankedEntries = ALL_LEADERBOARD_ENTRIES.filter((entry) => {
    if (moduleFilter !== 'all' && entry.module !== moduleFilter) return false;
    const rank = rankMap.get(entryKey(entry));
    return rank !== undefined && rank <= TOP_RANK_THRESHOLD;
  });

  const filteredEntries =
    moduleFilter === 'all'
      ? ALL_LEADERBOARD_ENTRIES
      : ALL_LEADERBOARD_ENTRIES.filter((entry) => entry.module === moduleFilter);

  return (
    <div className="space-y-8">
      {currentUserId && rankedEntries.length > 0 && (
        <section>
          <SectionTitle>{yourRankedTitle}</SectionTitle>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rankedEntries.map((entry) => (
              <LeaderboardCard
                key={entryKey(entry)}
                locale={locale}
                module={entry.module}
                settingKey={entry.key}
                period={period}
                rank={rankMap.get(entryKey(entry)) ?? null}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>{allLeaderboardsTitle}</SectionTitle>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </section>
    </div>
  );
}
