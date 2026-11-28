import type { ExpInfo } from '@blindfold-chess/features/exp';
import { and, eq } from 'drizzle-orm';
import 'server-only';

import { liveChallengeResult } from '@/lib/db/challenge-results-visibility';
import { getExpInfoBySource } from '@/lib/db/get-exp-info-by-source';
import { db } from '@/lib/db/index';
import { CHALLENGE_MENU_TYPES, type ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { challengeResults } from '@/lib/db/schema';
import { getScoreComparison } from '@/lib/db/score-comparison';
import {
  type LeaderboardPlacement,
  getLeaderboardPlacements,
} from '@/lib/mobile-api/leaderboard-placements';

import {
  type RecordView,
  deriveRecordView,
} from '@/app/[locale]/(public)/practice/_lib/derive-record-view';

/**
 * What the web's result page shows of a recorded run beyond its score,
 * computed the same way: the EXP card (`getExpInfoBySource` on the run's
 * `challenge_result` grant) and the "Your record" card (`getScoreComparison`
 * projected by `deriveRecordView`). The app renders both as they come, so the
 * badge rule and the history cut stay on the server.
 */
export type ChallengeResultSummary = {
  /** `null` when no EXP was granted or the grant was taken back. */
  exp: ExpInfo | null;
  record: RecordView;
  /** The menu the run belongs to, for the app's link into My Records. */
  menuType: string;
  /** The board the run was ranked on, for the app's link to it on the web. */
  leaderboardKey: string;
  /**
   * The player's own place on that board per period, after this run. The web's
   * result page shows a preview of the board instead, with other players in
   * it; the app shows no other user, so it gets only these numbers and links
   * to the board on the web.
   */
  placements: LeaderboardPlacement[];
};

const isChallengeMenuType = (value: string): value is ChallengeMenuType =>
  (CHALLENGE_MENU_TYPES as readonly string[]).includes(value);

/**
 * The summary of `userId`'s challenge result `challengeResultId`, or
 * `undefined` when the result is not theirs, not live, or not a challenge
 * menu. The menu and leaderboard key come from the row itself, so the caller
 * needs only the id the finish answered with.
 */
export async function getChallengeResultSummary(
  userId: string,
  challengeResultId: string
): Promise<ChallengeResultSummary | undefined> {
  const [row] = await db
    .select({
      menuType: challengeResults.menuType,
      leaderboardKey: challengeResults.leaderboardKey,
    })
    .from(challengeResults)
    .where(
      and(
        eq(challengeResults.id, challengeResultId),
        eq(challengeResults.userId, userId),
        liveChallengeResult()
      )
    )
    .limit(1);
  if (!row || !isChallengeMenuType(row.menuType)) return undefined;

  const [exp, comparison, placements] = await Promise.all([
    getExpInfoBySource(userId, 'challenge_result', challengeResultId),
    getScoreComparison(userId, row.menuType, row.leaderboardKey, challengeResultId),
    getLeaderboardPlacements(userId, row.menuType, row.leaderboardKey),
  ]);
  return {
    exp,
    record: deriveRecordView(comparison),
    menuType: row.menuType,
    leaderboardKey: row.leaderboardKey,
    placements,
  };
}
