import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
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

export async function getChallengeResultsPaginated(
  userId: string,
  page: number = 1,
  menuType?: ChallengeMenuType,
  leaderboardKey?: string
): Promise<GetChallengeResultsPaginatedResponse> {
  const conditions = [eq(challengeResults.userId, userId)];
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
