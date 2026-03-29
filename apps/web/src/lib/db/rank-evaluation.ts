/**
 * Rank Achievement Evaluation (段級位判定)
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
import { and, asc, eq } from 'drizzle-orm';
import 'server-only';

import { logActivityEvent } from '../activity-log';
import type { ChallengeScoreRequirement, GrantedRank, RankRequirement } from './data/ranks';
import { parseRequirements } from './data/ranks';
import { db } from './index';
import { challengeBestScores, ranks, userRanks } from './schema';

// ---------------------------------------------------------------------------
// Evaluators — one per requirement type
// ---------------------------------------------------------------------------

type RequirementEvaluator<T extends RankRequirement = RankRequirement> = (
  userId: string,
  requirement: T,
  tx?: typeof db
) => Promise<boolean>;

const evaluators: Record<string, RequirementEvaluator> = {
  challenge_score: async (userId, req, executor) => {
    const requirement = req as ChallengeScoreRequirement;
    const dbInstance = executor ?? db;
    const [best] = await dbInstance
      .select({ score: challengeBestScores.score })
      .from(challengeBestScores)
      .where(
        and(
          eq(challengeBestScores.userId, userId),
          eq(challengeBestScores.menuType, requirement.menuType),
          eq(challengeBestScores.leaderboardKey, requirement.leaderboardKey)
        )
      );
    return best !== undefined && best.score >= requirement.minScore;
  },
};

// ---------------------------------------------------------------------------
// Core evaluation logic
// ---------------------------------------------------------------------------

/**
 * Evaluate whether a user meets ALL requirements for a given rank.
 * Returns true only if every requirement is satisfied (implicit AND).
 */
export async function evaluateRankRequirements(
  userId: string,
  requirements: RankRequirement[],
  executor?: typeof db
): Promise<boolean> {
  for (const req of requirements) {
    const evaluate = evaluators[req.type];
    if (!evaluate) return false; // Unknown requirement type = fail
    const met = await evaluate(userId, req, executor);
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

  // 1. Get all rank IDs the user already has
  const achievedRanks = await db
    .select({ rankId: userRanks.rankId })
    .from(userRanks)
    .where(eq(userRanks.userId, userId));

  const achievedRankIds = new Set(achievedRanks.map((r) => r.rankId));

  // 2. Get all ranks ordered by level, filter to unachieved
  const allRanks = await db.select().from(ranks).orderBy(asc(ranks.level));

  const unachievedRanks = allRanks.filter((r) => !achievedRankIds.has(r.id));

  // 3. For each unachieved rank (in level order), evaluate requirements
  for (const rank of unachievedRanks) {
    const requirements = parseRequirements(rank.requirements);
    if (requirements.length === 0) continue; // No requirements = skip

    const met = await evaluateRankRequirements(userId, requirements);
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

    // 5. Log activity event (fire-and-forget)
    logActivityEvent({
      userId,
      action: 'rank_achieved',
      targetType: 'rank',
      targetId: rank.id,
      metadata: { rankSlug: rank.slug, level: rank.level },
    });
  }

  return granted;
}
