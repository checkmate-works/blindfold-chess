/**
 * Rank Achievement Evaluation
 *
 * @description
 * Evaluates whether a user qualifies for belt rank promotions after completing
 * challenges. Uses an evaluator pattern: one function per requirement `type`
 * (e.g., `challenge_score`). Ranks are evaluated linearly — stops at the first
 * unmet rank. Grants are idempotent via `onConflictDoNothing`.
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
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import 'server-only';

import type {
  ChallengeScoreRequirement,
  GrantedRank,
  PositionSubmissionCountRequirement,
  RankRequirement,
} from './data/ranks';
import { parseRequirements } from './data/ranks';
import { db } from './index';
import { challengeBestScores, positions, ranks, userRanks } from './schema';

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
 * Called after a challenge result is saved. Finds the next rank(s)
 * the user hasn't achieved yet (ordered by level), evaluates their
 * requirements, and grants them if all conditions are met.
 *
 * Stops at the first rank whose requirements are NOT met, since
 * progression is linear (can't skip ranks).
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
    if (!met) break; // Linear progression: stop at first unmet rank

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
