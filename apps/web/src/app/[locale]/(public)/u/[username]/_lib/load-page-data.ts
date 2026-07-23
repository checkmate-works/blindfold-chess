import { type SharedGameListItem, listGamesByAuthorId } from '@/lib/db/games-read';
import { GAME_LIKE_TARGET, type LikeMeta, getLikeMetaMap } from '@/lib/db/like-queries';
import { type ReplyMeta, getGameCommentMetaMap } from '@/lib/db/reply-meta-queries';

import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';

import { type ProfileShellData, loadProfileShellData } from './load-profile-shell-data';

type ProfileTab = 'topics' | 'games';

export type PublicProfilePageData = {
  activeTab: ProfileTab;
  initialFollowing: boolean;
  followedByProfile: boolean;
  viewerHasBlocked: boolean;
  followerCount: number;
  followingCount: number;
  posts: ProfilePostWithReplyMeta[];
  topicsCount: number;
  topicsCurrentPage: number;
  topicsTotalPages: number;
  problemsCount: number;
  games: SharedGameListItem[];
  gamesCount: number;
  gamesCurrentPage: number;
  gamesTotalPages: number;
  gameLikeMetaMap: Map<string, LikeMeta>;
  gameReplyMetaMap: Map<string, ReplyMeta>;
  userAchievementRows: ProfileShellData['userAchievementRows'];
};

/**
 * Load every server-side input the main public profile page needs to render
 * (topics tab and games tab — the problems tab now lives at
 * `/u/[username]/problems/{puzzles,position-memory}`, see
 * `problems/_lib/load-problems-page-data.ts`).
 *
 * Shell data (follow state, counts, achievements) is shared with the
 * `/problems/*` pages via `loadProfileShellData`. The games-tab slice is
 * fetched only when that tab is active, since it needs the post-pagination
 * math derived from the shell's counts.
 */
export async function loadPublicProfilePageData({
  profileId,
  currentUserId,
  isOwnProfile,
  parsedParams,
  pageSize,
}: {
  profileId: string;
  currentUserId: string | undefined;
  isOwnProfile: boolean;
  parsedParams: { page: number; tab: string };
  pageSize: number;
}): Promise<PublicProfilePageData> {
  const activeTab: ProfileTab = parsedParams.tab === 'games' ? 'games' : 'topics';

  const shell = await loadProfileShellData({ profileId, currentUserId, isOwnProfile });

  const topicsCount = shell.allPosts.length;
  const topicsTotalPages = Math.ceil(topicsCount / pageSize);
  const topicsCurrentPage =
    activeTab === 'topics' ? Math.max(1, Math.min(parsedParams.page, topicsTotalPages || 1)) : 1;
  const posts = shell.allPosts.slice(
    (topicsCurrentPage - 1) * pageSize,
    topicsCurrentPage * pageSize
  );

  const gamesTotalPages = Math.ceil(shell.gamesCount / pageSize);
  const gamesCurrentPage =
    activeTab === 'games' ? Math.max(1, Math.min(parsedParams.page, gamesTotalPages || 1)) : 1;

  let games: SharedGameListItem[] = [];
  let gameLikeMetaMap: Map<string, LikeMeta> = new Map();
  let gameReplyMetaMap: Map<string, ReplyMeta> = new Map();

  if (activeTab === 'games') {
    games = await listGamesByAuthorId(profileId, pageSize, (gamesCurrentPage - 1) * pageSize);

    const gameIds = games.map((g) => g.id);
    const [likeMetaMap, commentMetaMap] = await Promise.all([
      getLikeMetaMap(GAME_LIKE_TARGET, gameIds, currentUserId),
      getGameCommentMetaMap(gameIds),
    ]);

    gameLikeMetaMap = likeMetaMap;
    gameReplyMetaMap = commentMetaMap;
  }

  return {
    activeTab,
    initialFollowing: shell.initialFollowing,
    followedByProfile: shell.followedByProfile,
    viewerHasBlocked: shell.viewerHasBlocked,
    followerCount: shell.followerCount,
    followingCount: shell.followingCount,
    posts,
    topicsCount,
    topicsCurrentPage,
    topicsTotalPages,
    problemsCount: shell.problemsCount,
    games,
    gamesCount: shell.gamesCount,
    gamesCurrentPage,
    gamesTotalPages,
    gameLikeMetaMap,
    gameReplyMetaMap,
    userAchievementRows: shell.userAchievementRows,
  };
}
