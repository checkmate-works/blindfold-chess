/**
 * Reads behind the admin challenge results list.
 *
 * Unlike every other read of `challenge_results`, these do not always compose
 * `liveChallengeResult()`: the list exists to review removals as well as to
 * make them, so its `status` filter can ask for removed rows, or for both.
 * The live predicate is applied only when the filter says `live` (the
 * default). The key options likewise come from every row of the menu, so a key
 * that now holds only removed results can still be filtered on.
 *
 * The page's rows are fetched first; everything shown beside them (the
 * attempt, the player's refusal count, the username, the removal's audit
 * entry) is then read in one query each over the page's ids, so a page costs
 * the same number of round trips however many rows it holds.
 */
import type { ChallengeAttemptState } from '@blindfold-chess/features/challenge-attempt';
import { and, asc, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import {
  type ChallengeResult,
  challengeAttempts,
  challengeResults,
  db,
  moderationActions,
  profiles,
} from '@/lib/db';
import { liveChallengeResult } from '@/lib/db/challenge-results-visibility';
import { getPaginationParams } from '@/lib/pagination';

/**
 * `legacy`: no attempt is linked, so the score was reported by the client
 * before results were recorded from server-run attempts.
 * `refused`: the player has at least one attempt refused as implausibly fast.
 */
export type ChallengeResultSignal = 'legacy' | 'refused';
export type ChallengeResultStatus = 'live' | 'removed' | 'all';
export type ChallengeResultSort = 'recent' | 'score' | 'pace';

export type ChallengeResultListFilters = {
  menuType: string | null;
  /** Ignored unless `menuType` is set: a key is only meaningful within its menu. */
  leaderboardKey: string | null;
  /** `null` = no player filter; an empty array = the filter matched no one. */
  userIds: string[] | null;
  signal: ChallengeResultSignal | null;
  /**
   * Upper bound on seconds per answer (`time_taken / (score + mistakes)`);
   * `null` = no bound. A result with no answers has no pace and never matches.
   */
  maxPaceSeconds: number | null;
  status: ChallengeResultStatus;
  sort: ChallengeResultSort;
};

/** The attempt that recorded a result, as far as the list shows it. */
export type ChallengeResultAttempt = {
  id: string;
  rulesVersion: number;
  state: ChallengeAttemptState;
};

/** The latest removal entry for a removed result. */
export type ChallengeResultRemoval = {
  reason: string | null;
  removedAt: Date;
};

export type ChallengeResultListRow = ChallengeResult & {
  username: string | null;
  /** `null` for a legacy result. */
  attempt: ChallengeResultAttempt | null;
  /** The player's `implausible_speed` refusals across every menu. */
  refusalCount: number;
  /** `null` while the result is live, or if the audit entry is missing. */
  removal: ChallengeResultRemoval | null;
};

export type ChallengeResultListPage = {
  rows: ChallengeResultListRow[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
};

const IMPLAUSIBLE_SPEED = 'implausible_speed';

/** Answers a result took: every one is either a point or a mistake. */
const answered = sql`(${challengeResults.score} + ${challengeResults.incorrectAnswers})`;

function buildWhere(filters: ChallengeResultListFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.status === 'live') conditions.push(liveChallengeResult());
  if (filters.status === 'removed') conditions.push(isNotNull(challengeResults.deletedAt));

  if (filters.menuType) {
    conditions.push(eq(challengeResults.menuType, filters.menuType));
    if (filters.leaderboardKey) {
      conditions.push(eq(challengeResults.leaderboardKey, filters.leaderboardKey));
    }
  }

  if (filters.userIds) conditions.push(inArray(challengeResults.userId, filters.userIds));

  if (filters.signal === 'legacy') {
    conditions.push(
      sql`NOT EXISTS (SELECT 1 FROM challenge_attempts a WHERE a.challenge_result_id = ${challengeResults.id})`
    );
  }
  if (filters.signal === 'refused') {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM challenge_attempts a WHERE a.user_id = ${challengeResults.userId} AND a.outcome = ${IMPLAUSIBLE_SPEED})`
    );
  }

  if (filters.maxPaceSeconds != null) {
    // Multiplied out rather than divided, so a result with no answers needs no
    // special case beyond the `> 0` guard.
    conditions.push(
      sql`${answered} > 0 AND ${challengeResults.timeTaken} <= ${filters.maxPaceSeconds}::float8 * ${answered}`
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * `score` follows the leaderboard's own order (more points, then fewer
 * mistakes, then less time). `pace` puts the fewest seconds per answer first,
 * which is where an implausibly fast result sits, and results with no answers
 * last. Every order ends on the id so that rows with equal
 * keys keep their place between pages.
 */
function buildOrderBy(sort: ChallengeResultSort): SQL[] {
  if (sort === 'score') {
    return [
      desc(challengeResults.score),
      asc(challengeResults.incorrectAnswers),
      asc(challengeResults.timeTaken),
      desc(challengeResults.id),
    ];
  }
  if (sort === 'pace') {
    return [
      sql`${challengeResults.timeTaken}::float8 / NULLIF(${answered}, 0) ASC NULLS LAST`,
      desc(challengeResults.score),
      desc(challengeResults.id),
    ];
  }
  return [desc(challengeResults.createdAt), desc(challengeResults.id)];
}

/**
 * One page of challenge results with their signals. The rows and the total
 * share one WHERE, so the total always counts what the pages can show.
 */
export async function getChallengeResultListPage(
  filters: ChallengeResultListFilters,
  requestedPage: number
): Promise<ChallengeResultListPage> {
  if (filters.userIds?.length === 0) {
    const empty = getPaginationParams(requestedPage, 0);
    return {
      rows: [],
      totalCount: 0,
      currentPage: empty.currentPage,
      totalPages: empty.totalPages,
      pageSize: empty.limit,
    };
  }

  const where = buildWhere(filters);

  const [countRow] = await db.select({ count: count() }).from(challengeResults).where(where);
  const totalCount = Number(countRow?.count ?? 0);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(requestedPage, totalCount);

  const results = await db
    .select()
    .from(challengeResults)
    .where(where)
    .orderBy(...buildOrderBy(filters.sort))
    .limit(limit)
    .offset(offset);

  const rows = await attachSignals(results);
  return { rows, totalCount, currentPage, totalPages, pageSize: limit };
}

async function attachSignals(results: ChallengeResult[]): Promise<ChallengeResultListRow[]> {
  if (results.length === 0) return [];

  const resultIds = results.map((r) => r.id);
  const userIds = [...new Set(results.map((r) => r.userId))];
  const removedIds = results.filter((r) => r.deletedAt != null).map((r) => r.id);

  const [attempts, refusals, rowProfiles, removals] = await Promise.all([
    db
      .select({
        id: challengeAttempts.id,
        resultId: challengeAttempts.challengeResultId,
        rulesVersion: challengeAttempts.rulesVersion,
        state: challengeAttempts.state,
      })
      .from(challengeAttempts)
      .where(inArray(challengeAttempts.challengeResultId, resultIds)),
    db
      .select({ userId: challengeAttempts.userId, count: count() })
      .from(challengeAttempts)
      .where(
        and(
          inArray(challengeAttempts.userId, userIds),
          eq(challengeAttempts.outcome, IMPLAUSIBLE_SPEED)
        )
      )
      .groupBy(challengeAttempts.userId),
    db
      .select({ id: profiles.id, username: profiles.username })
      .from(profiles)
      .where(inArray(profiles.id, userIds)),
    removedIds.length > 0
      ? db
          .select({
            targetId: moderationActions.targetId,
            reason: moderationActions.reason,
            createdAt: moderationActions.createdAt,
          })
          .from(moderationActions)
          .where(
            and(
              eq(moderationActions.targetType, 'challenge_result'),
              eq(moderationActions.action, 'delete_challenge_result'),
              inArray(moderationActions.targetId, removedIds)
            )
          )
          .orderBy(desc(moderationActions.createdAt))
      : Promise.resolve([]),
  ]);

  const attemptByResult = new Map<string, ChallengeResultAttempt>();
  for (const a of attempts) {
    if (a.resultId && !attemptByResult.has(a.resultId)) {
      attemptByResult.set(a.resultId, { id: a.id, rulesVersion: a.rulesVersion, state: a.state });
    }
  }
  const refusalsByUser = new Map(refusals.map((r) => [r.userId, Number(r.count)]));
  const usernameById = new Map(rowProfiles.map((p) => [p.id, p.username]));
  // Ordered newest first, so the first entry seen per result is the latest.
  const removalByResult = new Map<string, ChallengeResultRemoval>();
  for (const m of removals) {
    if (!removalByResult.has(m.targetId)) {
      removalByResult.set(m.targetId, { reason: m.reason, removedAt: m.createdAt });
    }
  }

  return results.map((r) => ({
    ...r,
    username: usernameById.get(r.userId) ?? null,
    attempt: attemptByResult.get(r.id) ?? null,
    refusalCount: refusalsByUser.get(r.userId) ?? 0,
    removal: r.deletedAt != null ? (removalByResult.get(r.id) ?? null) : null,
  }));
}

/**
 * The leaderboard keys recorded for a menu, for the key filter's options.
 * Removed rows count too, so their keys stay reachable from `status=removed`.
 */
export async function listChallengeLeaderboardKeys(menuType: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ key: challengeResults.leaderboardKey })
    .from(challengeResults)
    .where(eq(challengeResults.menuType, menuType))
    .orderBy(asc(challengeResults.leaderboardKey));
  return rows.map((r) => r.key);
}
