import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { liveChallengeResult } from '@/lib/db/challenge-results-visibility';
import { countRows } from '@/lib/db/list-query';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { challengeResults } from '@/lib/db/schema';
import { resolvePagination } from '@/lib/pagination';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';

export type GetChallengeResultsPaginatedResponse = {
  items: ChallengeResultRow[];
  totalPages: number;
};

const PAGE_SIZE = 20;

/**
 * One page of the player's own challenge results, newest first.
 *
 * Results removed by moderation are left out of both the rows and the count:
 * the predicate is part of the single `whereClause` the two queries share, so
 * `totalPages` cannot count rows the list no longer shows.
 */
export async function getChallengeResultsPaginated(
  userId: string,
  page: number = 1,
  menuType?: ChallengeMenuType,
  leaderboardKey?: string
): Promise<GetChallengeResultsPaginatedResponse> {
  const conditions = [eq(challengeResults.userId, userId), liveChallengeResult()];
  if (menuType) {
    conditions.push(eq(challengeResults.menuType, menuType));
  }
  if (leaderboardKey) {
    conditions.push(eq(challengeResults.leaderboardKey, leaderboardKey));
  }

  const whereClause = and(...conditions);

  const totalCount = await countRows(challengeResults, whereClause);

  const { totalPages, offset } = resolvePagination(page, totalCount, PAGE_SIZE);

  const items = await db
    .select({
      id: challengeResults.id,
      menuType: challengeResults.menuType,
      leaderboardKey: challengeResults.leaderboardKey,
      score: challengeResults.score,
      incorrectAnswers: challengeResults.incorrectAnswers,
      timeTaken: challengeResults.timeTaken,
      createdAt: challengeResults.createdAt,
    })
    .from(challengeResults)
    .where(whereClause)
    .orderBy(desc(challengeResults.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  return { items, totalPages };
}

/**
 * The `leaderboard_key` of the player's most recent record for `menuType`,
 * or `undefined` when they have none.
 *
 * The results page uses it as the key filter when the URL carries a menu
 * but no key. It used to fall back to a fixed key (`white`, `random`), which
 * for a player who only ever practised the knight meant "Legal Moves → no
 * results" while their records sat one click away. The most recent key is
 * never empty and is the setting they are most likely to want next.
 *
 * Only live results count, so a key whose sole record was removed by
 * moderation is not picked as a filter that would then show nothing.
 */
export async function getLatestLeaderboardKey(
  userId: string,
  menuType: ChallengeMenuType
): Promise<string | undefined> {
  const [row] = await db
    .select({ leaderboardKey: challengeResults.leaderboardKey })
    .from(challengeResults)
    .where(
      and(
        eq(challengeResults.userId, userId),
        eq(challengeResults.menuType, menuType),
        liveChallengeResult()
      )
    )
    .orderBy(desc(challengeResults.createdAt))
    .limit(1);
  return row?.leaderboardKey;
}
