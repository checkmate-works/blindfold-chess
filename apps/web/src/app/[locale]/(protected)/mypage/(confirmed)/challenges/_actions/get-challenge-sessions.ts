'use server';

import { and, desc, eq, gte, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { CHALLENGE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import { challengeResults } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export type { DatePeriod } from '../_lib/period-utils';

export type ChallengeResultRow = {
  id: string;
  menuType: string;
  leaderboardKey: string;
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
  createdAt: Date;
};

export type GetChallengeSessionsResponse = {
  success: boolean;
  sessions: ChallengeResultRow[];
  previousSessions: ChallengeResultRow[];
};

/** Resolve the current user ID from Supabase auth, or null if unauthenticated. */
async function getSessionUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function querySessionsByRange(
  userId: string,
  menuType: string | null,
  range: { start: Date; end: Date }
) {
  const conditions = [eq(challengeResults.userId, userId)];
  if (menuType) {
    conditions.push(eq(challengeResults.menuType, menuType));
  }
  conditions.push(gte(challengeResults.createdAt, range.start));
  conditions.push(lt(challengeResults.createdAt, range.end));

  return db
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
    .where(and(...conditions))
    .orderBy(desc(challengeResults.createdAt));
}

export async function getChallengeSessions(
  menuType: ChallengeMenuType | undefined,
  currentRangeStart: string,
  currentRangeEnd: string,
  previousRangeStart: string,
  previousRangeEnd: string
): Promise<GetChallengeSessionsResponse> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, sessions: [], previousSessions: [] };
    }

    const menu = menuType ?? null;
    const currentRange = { start: new Date(currentRangeStart), end: new Date(currentRangeEnd) };
    const previousRange = { start: new Date(previousRangeStart), end: new Date(previousRangeEnd) };

    const sessions = await querySessionsByRange(userId, menu, currentRange);
    const previousSessions = await querySessionsByRange(userId, menu, previousRange);

    return { success: true, sessions, previousSessions };
  } catch (error) {
    console.error('Failed to fetch challenge sessions:', error);
    return { success: false, sessions: [], previousSessions: [] };
  }
}

export async function getAvailableMenuTypes(): Promise<ChallengeMenuType[]> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return [];

    const rows = await db
      .selectDistinct({ menuType: challengeResults.menuType })
      .from(challengeResults)
      .where(eq(challengeResults.userId, userId));

    return rows
      .map((r) => r.menuType)
      .filter((m): m is ChallengeMenuType => CHALLENGE_MENU_TYPES.includes(m as ChallengeMenuType));
  } catch {
    return [];
  }
}
