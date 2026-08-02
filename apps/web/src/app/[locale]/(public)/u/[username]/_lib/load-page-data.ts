import type { RankSlug } from '@/lib/db/data/ranks';

import { getAchievedSlugsForUser } from '@/app/[locale]/(public)/dojo/ranks/_lib/queries';
import { resolveHighestAchievedSlug } from '@/app/[locale]/(public)/dojo/ranks/_lib/rank-progression';

import { type ProfileShellData, loadProfileShellData } from './load-profile-shell-data';

export type PublicProfilePageData = ProfileShellData & {
  /** Highest rank actually held; `null` for an unranked (mukyu) member. */
  rankSlug: RankSlug | null;
};

/**
 * Server-side inputs for the profile page shell: the shared shell data plus
 * the member's belt rank.
 *
 * The timeline is deliberately absent — `ProfileTimeline` runs its own query
 * inside a `<Suspense>` boundary so the header, stats band and filter chips
 * stream without waiting on the feed. Pulling the feed back in here would
 * re-block the whole page on it and take the filter-switch skeleton with it.
 *
 * The rank lookup lives here rather than in {@link loadProfileShellData}
 * because only this page renders it — the archive pages share the shell and
 * would otherwise pay for two queries they never use.
 */
export async function loadPublicProfilePageData({
  profileId,
  currentUserId,
  isOwnProfile,
}: {
  profileId: string;
  currentUserId: string | undefined;
  isOwnProfile: boolean;
}): Promise<PublicProfilePageData> {
  const [shell, achievedSlugs] = await Promise.all([
    loadProfileShellData({ profileId, currentUserId, isOwnProfile }),
    getAchievedSlugsForUser(profileId),
  ]);

  return {
    ...shell,
    rankSlug: resolveHighestAchievedSlug(achievedSlugs),
  };
}
