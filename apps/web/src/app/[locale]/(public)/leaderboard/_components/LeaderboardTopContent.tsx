import { getNativeTileCreatives } from '@/lib/ads/ad';
import { withSingleNativeAd } from '@/lib/ads/placement';
import { LEADERBOARD_TOP_NATIVE_AD_SLOT } from '@/lib/ads/registry';
import { getOptionalUser } from '@/lib/auth';

import { NativeAdTile } from '@/app/[locale]/_components/NativeAdTile';
import type { Locale } from '@/app/[locale]/_lib/types';

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
  // `Locale`, not `string`: the ad pool is read per locale, and the only
  // caller already has one — the wider type was just never narrowed.
  locale: Locale;
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

  // The one ad placement in the leaderboard section. Nothing goes inside a
  // ranking — see `LEADERBOARD_TOP_NATIVE_AD_SLOT` for why the detail pages'
  // table is off limits however much it looks like a list.
  //
  // One tile, placed by the `/practice` grid's rule rather than the repeating
  // one: this is a menu of leaderboards to open, not a column to read, and the
  // module filter can narrow it to a couple of tiles. Viewer-independent, like
  // the other grid — the per-reader hide is the `bfc_ads_hidden` cookie and
  // the CSS rule `NativeAdTile` owns.
  const [creative] = await getNativeTileCreatives(LEADERBOARD_TOP_NATIVE_AD_SLOT, locale);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {withSingleNativeAd(
        filteredEntries.map((entry) => (
          <LeaderboardCard
            key={entryKey(entry)}
            locale={locale}
            module={entry.module}
            settingKey={entry.key}
            period={period}
            rank={currentUserId ? (rankMap.get(entryKey(entry)) ?? null) : null}
          />
        )),
        creative ? <NativeAdTile key="native-ad" creative={creative} variant="iconTile" /> : null
      )}
    </div>
  );
}
