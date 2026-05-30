'use server';

import * as Sentry from '@sentry/nextjs';
import { and, desc, eq, gte, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { CHALLENGE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import { challengeResults } from '@/lib/db/schema';
import { handleServerActionError } from '@/lib/server-action-error';
import { createClient } from '@/lib/supabase/server';

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
    handleServerActionError(error, '[getChallengeSessions]');
    return { success: false, sessions: [], previousSessions: [] };
  }
}

/**
 * Returns the challenge menu types the current user has records for.
 *
 * When a date range is supplied, only menu types with at least one record
 * inside `[rangeStart, rangeEnd)` are returned (used by the dashboard so the
 * category select hides categories with no records in the selected period).
 * Omitting the range yields the all-time set (used by the "view all results"
 * page). In both cases the result is ordered to match the `/practice` page
 * (i.e. the `PRACTICE_MODULE_REGISTRY` order), not the arbitrary DB order.
 */
export async function getAvailableMenuTypes(
  rangeStart?: string,
  rangeEnd?: string
): Promise<ChallengeMenuType[]> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return [];

    const conditions = [eq(challengeResults.userId, userId)];
    if (rangeStart && rangeEnd) {
      conditions.push(gte(challengeResults.createdAt, new Date(rangeStart)));
      conditions.push(lt(challengeResults.createdAt, new Date(rangeEnd)));
    }

    const rows = await db
      .selectDistinct({ menuType: challengeResults.menuType })
      .from(challengeResults)
      .where(and(...conditions));

    const present = new Set(rows.map((r) => r.menuType));
    return CHALLENGE_MENU_TYPES.filter((m) => present.has(m));
  } catch (error) {
    Sentry.captureException(error);
    return [];
  }
}
