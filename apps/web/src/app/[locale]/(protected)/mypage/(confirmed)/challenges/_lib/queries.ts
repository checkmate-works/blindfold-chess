import { and, count, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { challengeResults } from '@/lib/db/schema';

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

  const [countResult] = await db
    .select({ count: count() })
    .from(challengeResults)
    .where(whereClause);

  const totalCount = countResult.count;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

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
    .offset((currentPage - 1) * PAGE_SIZE);

  return { items, totalPages };
}
