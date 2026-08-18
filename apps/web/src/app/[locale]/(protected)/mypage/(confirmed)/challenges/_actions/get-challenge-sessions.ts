'use server';

import * as Sentry from '@sentry/nextjs';
import { and, desc, eq, gte, lt } from 'drizzle-orm';

import { getOptionalUser } from '@/lib/auth';
import { db } from '@/lib/db';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { CHALLENGE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import { challengeResults } from '@/lib/db/schema';
import { handleServerActionError } from '@/lib/server-action-error';

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
  const user = await getOptionalUser();
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

    const [sessions, previousSessions] = await Promise.all([
      querySessionsByRange(userId, menu, currentRange),
      querySessionsByRange(userId, menu, previousRange),
    ]);

    return { success: true, sessions, previousSessions };
  } catch (error) {
    handleServerActionError(error, '[getChallengeSessions]');
    return { success: false, sessions: [], previousSessions: [] };
  }
}

export type GetChallengeDashboardDataResponse = {
  success: boolean;
  /** Menu types with at least one record in the current range, registry-ordered. */
  availableMenuTypes: ChallengeMenuType[];
  /**
   * The menu the sessions below belong to: `preferredMenu` when it is still
   * available in this range, otherwise the first available type, otherwise
   * `null` (empty period).
   */
  selectedMenu: ChallengeMenuType | null;
  sessions: ChallengeResultRow[];
  previousSessions: ChallengeResultRow[];
};

/**
 * One-round-trip payload for the dashboard: the available menu types for the
 * period AND the sessions of the (reconciled) selected menu. The client used
 * to chain `getAvailableMenuTypes` → `getChallengeSessions` from two effects,
 * paying two sequential server round trips on mount and on every period
 * change; menu reconciliation lives here now so one call answers both.
 *
 * Ranges are computed client-side on purpose: `getPeriodRange` anchors to the
 * viewer's local timezone, which the server does not know.
 */
export async function getChallengeDashboardData(
  preferredMenu: ChallengeMenuType | undefined,
  currentRangeStart: string,
  currentRangeEnd: string,
  previousRangeStart: string,
  previousRangeEnd: string
): Promise<GetChallengeDashboardDataResponse> {
  const empty = { availableMenuTypes: [], selectedMenu: null, sessions: [], previousSessions: [] };
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, ...empty };
    }

    const currentRange = { start: new Date(currentRangeStart), end: new Date(currentRangeEnd) };
    const previousRange = { start: new Date(previousRangeStart), end: new Date(previousRangeEnd) };

    const availableMenuTypes = await listAvailableMenuTypes(userId, currentRange);
    const selectedMenu =
      preferredMenu && availableMenuTypes.includes(preferredMenu)
        ? preferredMenu
        : (availableMenuTypes[0] ?? null);

    if (!selectedMenu) {
      return { success: true, ...empty, availableMenuTypes };
    }

    const [sessions, previousSessions] = await Promise.all([
      querySessionsByRange(userId, selectedMenu, currentRange),
      querySessionsByRange(userId, selectedMenu, previousRange),
    ]);

    return { success: true, availableMenuTypes, selectedMenu, sessions, previousSessions };
  } catch (error) {
    handleServerActionError(error, '[getChallengeDashboardData]');
    return { success: false, ...empty };
  }
}

async function listAvailableMenuTypes(
  userId: string,
  range?: { start: Date; end: Date }
): Promise<ChallengeMenuType[]> {
  const conditions = [eq(challengeResults.userId, userId)];
  if (range) {
    conditions.push(gte(challengeResults.createdAt, range.start));
    conditions.push(lt(challengeResults.createdAt, range.end));
  }

  const rows = await db
    .selectDistinct({ menuType: challengeResults.menuType })
    .from(challengeResults)
    .where(and(...conditions));

  const present = new Set(rows.map((r) => r.menuType));
  return CHALLENGE_MENU_TYPES.filter((m) => present.has(m));
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

    const range =
      rangeStart && rangeEnd ? { start: new Date(rangeStart), end: new Date(rangeEnd) } : undefined;
    return await listAvailableMenuTypes(userId, range);
  } catch (error) {
    Sentry.captureException(error);
    return [];
  }
}
