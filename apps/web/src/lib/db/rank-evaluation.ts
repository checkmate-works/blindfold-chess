/**
 * Rank Achievement Evaluation
 *
 * @description
 * Evaluates whether a user qualifies for belt rank promotions after completing
 * challenges. Uses an evaluator pattern: one function per requirement `type`
 * (e.g., `challenge_score`). Every unachieved rank is evaluated independently —
 * an unmet lower rank never blocks a higher one (skip-grants are allowed by
 * design). Grants are idempotent via `onConflictDoNothing`.
 *
 * @design Evaluator pattern, not per-rank strategy
 *
 * Evaluators are keyed by `requirement.type`, not by rank slug. This means:
 * - Adding a new rank: seed data only, no code changes.
 * - Adding a new requirement type (e.g., `post_count`): add one evaluator to
 *   the `evaluators` record and a type guard branch.
 *
 * @design Called outside the challenge transaction
 *
 * `checkAndGrantRanks` must run AFTER `saveChallengeResult`'s transaction
 * commits, so that `challenge_best_scores` reflects the latest data. It is
 * wrapped in try-catch at the call site — rank evaluation failure must never
 * break the challenge result save flow.
 *
 * @see {@link checkAndGrantRanks} — entry point, called from `saveChallengeResult`
 * @see {@link evaluators} — registry of requirement type evaluators
 */
import * as Sentry from '@sentry/nextjs';
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm';
import 'server-only';

import {
  isConstrainedPlaySettings,
  maintainedHiddenBoard,
} from '@/lib/games/play-settings-constraint';

import type {
  ChallengeScoreRequirement,
  GamePublishWinHiddenBoardRequirement,
  GamePublishWinRequirement,
  GrantedRank,
  PositionSubmissionCountRequirement,
  RankRequirement,
} from './data/ranks';
import { parseRequirements } from './data/ranks';
import { db } from './index';
import { challengeBestScores, games, positions, ranks, userRanks } from './schema';

// ---------------------------------------------------------------------------
// Pre-fetched scores cache type
// ---------------------------------------------------------------------------

type BestScoreCache = Map<string, number>;

function bestScoreCacheKey(menuType: string, leaderboardKey: string): string {
  return `${menuType}:${leaderboardKey}`;
}

// ---------------------------------------------------------------------------
// Evaluators — one per requirement type
// ---------------------------------------------------------------------------

type RequirementEvaluator<T extends RankRequirement = RankRequirement> = (
  userId: string,
  requirement: T,
  tx?: typeof db,
  scoreCache?: BestScoreCache
) => Promise<boolean>;

const evaluators: Record<string, RequirementEvaluator> = {
  challenge_score: async (_userId, req, _executor, scoreCache) => {
    const requirement = req as ChallengeScoreRequirement;

    // Use pre-fetched scores when available (avoids N+1 queries)
    if (scoreCache) {
      const key = bestScoreCacheKey(requirement.menuType, requirement.leaderboardKey);
      const score = scoreCache.get(key);
      return score !== undefined && score >= requirement.minScore;
    }

    // Fallback: query DB directly (for backward compatibility with evaluateRankRequirements)
    const dbInstance = _executor ?? db;
    const [best] = await dbInstance
      .select({ score: challengeBestScores.score })
      .from(challengeBestScores)
      .where(
        and(
          eq(challengeBestScores.userId, _userId),
          eq(challengeBestScores.menuType, requirement.menuType),
          eq(challengeBestScores.leaderboardKey, requirement.leaderboardKey)
        )
      );
    return best !== undefined && best.score >= requirement.minScore;
  },
  position_submission_count: async (userId, req, executor) => {
    const requirement = req as PositionSubmissionCountRequirement;
    const dbInstance = executor ?? db;
    const [row] = await dbInstance
      .select({ value: count() })
      .from(positions)
      .where(and(eq(positions.userId, userId), inArray(positions.type, requirement.positionTypes)));
    return (row?.value ?? 0) >= requirement.minCount;
  },
  game_publish_win: async (userId, req, executor) => {
    const requirement = req as GamePublishWinRequirement;
    const dbInstance = executor ?? db;

    // The "was it constrained?" test reads a JSONB blob and is product logic
    // worth keeping honest and unit-tested, so it stays in TS rather than
    // becoming an un-indexable SQL predicate over `play_settings`. Only the
    // cheap, indexed half of the filter goes to the database; the row set left
    // over is one user's won games, which is small.
    const rows = await dbInstance
      .select({ playSettings: games.playSettings })
      .from(games)
      .where(
        and(
          eq(games.authorId, userId),
          eq(games.result, 'win'),
          eq(games.status, 'public'),
          isNull(games.deletedAt)
        )
      );

    const qualifying = rows.filter((row) => isConstrainedPlaySettings(row.playSettings));
    return qualifying.length >= requirement.minCount;
  },
  game_publish_win_hidden_board: async (userId, req, executor) => {
    const requirement = req as GamePublishWinHiddenBoardRequirement;
    const dbInstance = executor ?? db;

    const rows = await dbInstance
      .select({
        playSettings: games.playSettings,
        playSettingsLog: games.playSettingsLog,
        operationLogs: games.operationLogs,
      })
      .from(games)
      .where(
        and(
          eq(games.authorId, userId),
          eq(games.result, 'win'),
          eq(games.status, 'public'),
          isNull(games.deletedAt)
        )
      );

    // A game with a malformed operationLogs entry is disqualified rather than
    // crashing — a crash here would take down checkAndGrantRanks for every
    // future trigger of this user (the error is swallowed and only reaches
    // Sentry), permanently blocking promotion. Lenient (treat as 0 peeks)
    // is deliberately not chosen: don't promote on unverifiable logs.
    const qualifying = rows.filter((row) => {
      if (!maintainedHiddenBoard(row.playSettings, row.playSettingsLog)) return false;
      const logs = row.operationLogs ?? [];
      let peeks = 0;
      for (const log of logs) {
        if (typeof log?.peekCount !== 'number' || Number.isNaN(log.peekCount)) return false;
        peeks += log.peekCount;
      }
      return peeks <= requirement.maxPeeks;
    });
    return qualifying.length >= requirement.minCount;
  },
};

// ---------------------------------------------------------------------------
// Core evaluation logic
// ---------------------------------------------------------------------------

/**
 * Evaluate whether a user meets ALL requirements for a given rank.
 * Returns true only if every requirement is satisfied (implicit AND).
 * When scoreCache is provided, evaluators use it instead of querying the DB.
 */
export async function evaluateRankRequirements(
  userId: string,
  requirements: RankRequirement[],
  executor?: typeof db,
  scoreCache?: BestScoreCache
): Promise<boolean> {
  for (const req of requirements) {
    const evaluate = evaluators[req.type];
    if (!evaluate) return false; // Unknown requirement type = fail
    const met = await evaluate(userId, req, executor, scoreCache);
    if (!met) return false;
  }
  return true;
}

/**
 * Check and grant any newly achievable ranks for a user.
 *
 * Called after every rank-relevant trigger (challenge save, position
 * create, game publish, game claim). Evaluates every unachieved rank
 * INDEPENDENTLY, in level order: each rank grants the moment its own
 * requirements are met, regardless of lower ranks — so a brand-new
 * player who publishes a black-belt-grade win jumps straight to 1dan
 * with no kyū ranks at all. Sparse achievement sets are a supported
 * state everywhere downstream (`resolveNextRank` recommends the first
 * unachieved slug above the highest achieved rank; the ranks grid and
 * admin stats key off actual rows).
 *
 * This is a deliberate product choice (UGC first): the old linear
 * "stop at the first unmet rank" gate was removed 2026-07-18 so a
 * single published game can promote anyone immediately.
 *
 * Note: This function uses its own transaction. It should be called
 * AFTER the challenge result transaction commits, so that
 * challenge_best_scores reflects the latest data.
 */
export type { GrantedRank } from './data/ranks';

export async function checkAndGrantRanks(userId: string): Promise<GrantedRank[]> {
  const granted: GrantedRank[] = [];

  // 1. Get all rank IDs the user already has, all ranks, and pre-fetch all best scores in parallel
  const [achievedRanks, allRanks, allBestScores] = await Promise.all([
    db.select({ rankId: userRanks.rankId }).from(userRanks).where(eq(userRanks.userId, userId)),
    db.select().from(ranks).orderBy(asc(ranks.level)),
    db
      .select({
        menuType: challengeBestScores.menuType,
        leaderboardKey: challengeBestScores.leaderboardKey,
        score: challengeBestScores.score,
      })
      .from(challengeBestScores)
      .where(eq(challengeBestScores.userId, userId)),
  ]);

  const achievedRankIds = new Set(achievedRanks.map((r) => r.rankId));

  // Build in-memory score cache to avoid N+1 queries during evaluation
  const scoreCache: BestScoreCache = new Map(
    allBestScores.map((s) => [bestScoreCacheKey(s.menuType, s.leaderboardKey), s.score])
  );

  // 2. Filter to unachieved ranks
  const unachievedRanks = allRanks.filter((r) => !achievedRankIds.has(r.id));

  // 3. For each unachieved rank (in level order), evaluate requirements
  for (const rank of unachievedRanks) {
    const requirements = parseRequirements(rank.requirements);
    if (requirements.length === 0) continue; // No requirements = skip

    const met = await evaluateRankRequirements(userId, requirements, undefined, scoreCache);
    if (!met) continue; // Independent evaluation: an unmet rank never blocks higher ones

    // 4. Grant the rank
    await db
      .insert(userRanks)
      .values({
        userId,
        rankId: rank.id,
      })
      .onConflictDoNothing({
        target: [userRanks.userId, userRanks.rankId],
      });

    granted.push({ slug: rank.slug, level: rank.level, color: rank.color });

    // Note: rank achievements are NOT recorded in user_activity_log. The
    // `user_ranks` table is itself an immutable, INSERT-only achievement
    // history (with `achievedAt`), so logging here would only duplicate that
    // authoritative source. user_activity_log is reserved for events that
    // leave no other durable trace (auth) or are reversible (like/follow).
  }

  return granted;
}

/**
 * Best-effort rank evaluation for the tail of a UGC-create flow. Rank
 * evaluation is supplementary and must not fail the create, so failures are
 * swallowed after being reported (console + Sentry). Call AFTER the create
 * transaction commits so the freshly inserted row counts toward
 * count-based requirements (e.g. position_submission_count for 2kyu).
 */
export async function evaluateRanksAfterCreate(
  userId: string,
  context: string
): Promise<GrantedRank[]> {
  try {
    return await checkAndGrantRanks(userId);
  } catch (error) {
    console.error(`Failed to check/grant ranks after ${context}:`, error);
    Sentry.captureException(error);
    return [];
  }
}
