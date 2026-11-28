import { and, desc, eq, gte, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import { liveChallengeResult } from '@/lib/db/challenge-results-visibility';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { CHALLENGE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import { challengeResults } from '@/lib/db/schema';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';

type Range = { start: Date; end: Date };

/**
 * The player's results in `range`, newest first. Results removed by
 * moderation are left out, so the dashboard's session list and its
 * period-over-period comparison only ever count live runs.
 */
export function querySessionsByRange(
  userId: string,
  menuType: string | null,
  range: { start: Date; end: Date }
) {
  const conditions = [eq(challengeResults.userId, userId), liveChallengeResult()];
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

/**
 * The menus the player has live results for. A menu whose only results were
 * removed by moderation is not offered, since selecting it would show nothing.
 */
export async function listAvailableMenuTypes(
  userId: string,
  range?: { start: Date; end: Date }
): Promise<ChallengeMenuType[]> {
  const conditions = [eq(challengeResults.userId, userId), liveChallengeResult()];
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
 * The dashboard's payload for one (period, menu) pair: the menus with
 * records in the current range, the reconciled selection (`preferredMenu`
 * when it still has records there, otherwise the first available menu,
 * otherwise `null`), and that menu's runs in the current and previous
 * ranges. Shared by the web's Server Action and the mobile API, which differ
 * only in how they authenticate.
 *
 * The ranges come from the caller: `getPeriodRange` anchors to the viewer's
 * local timezone, which the server does not know.
 */
export async function loadChallengeDashboard(
  userId: string,
  preferredMenu: ChallengeMenuType | undefined,
  ranges: { current: Range; previous: Range }
): Promise<{
  availableMenuTypes: ChallengeMenuType[];
  selectedMenu: ChallengeMenuType | null;
  sessions: ChallengeResultRow[];
  previousSessions: ChallengeResultRow[];
}> {
  const availableMenuTypes = await listAvailableMenuTypes(userId, ranges.current);
  const selectedMenu =
    preferredMenu && availableMenuTypes.includes(preferredMenu)
      ? preferredMenu
      : (availableMenuTypes[0] ?? null);

  if (!selectedMenu) {
    return { availableMenuTypes, selectedMenu: null, sessions: [], previousSessions: [] };
  }

  const [sessions, previousSessions] = await Promise.all([
    querySessionsByRange(userId, selectedMenu, ranges.current),
    querySessionsByRange(userId, selectedMenu, ranges.previous),
  ]);
  return { availableMenuTypes, selectedMenu, sessions, previousSessions };
}
