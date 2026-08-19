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
 *   the `evaluators` record here, and a type guard branch in
 *   `parseRequirements` (`./data/ranks.ts` — the type guards live there, not
 *   in this module).
 *
 * @design Called outside the challenge transaction
 *
 * `checkAndGrantRanks` must run AFTER `saveChallengeResult`'s transaction
 * commits, so that `challenge_best_scores` reflects the latest data. It is
 * wrapped in try-catch at the call site — rank evaluation failure must never
 * break the challenge result save flow.
 *
 * @design Per-pass evaluation context
 *
 * `checkAndGrantRanks` evaluates every unachieved rank in ONE pass, so its
 * evaluators share a `RankEvalContext` for that pass rather than each
 * querying independently. This matters most for `game_publish_win` and
 * `game_publish_win_hidden_board`: their WHERE clauses are identical
 * (author's public, non-deleted, won games — `game_publish_win_hidden_board`
 * just reads more columns off the same rows), so a new player evaluated for
 * both 1kyu and 1dan in the same pass would otherwise run that query twice.
 * `RankEvalContext.getWonPublicGames()` fetches it once (lazily, only if a
 * game-based evaluator actually runs) and both evaluators filter the shared
 * result in TS.
 *
 * @see {@link checkAndGrantRanks} — entry point, called from `saveChallengeResult`
 * @see {@link evaluators} — registry of requirement type evaluators
 */
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm';
import 'server-only';

import { isOperationTotals } from '@/lib/games/operation-totals';
import {
  isConstrainedPlaySettings,
  maintainedHiddenBoard,
} from '@/lib/games/play-settings-constraint';
import type {
  GamePlaySettings,
  MoveOperationLog,
  OperationTotals,
  PlaySettingsChangeEntry,
} from '@/lib/games/saved-game-types';
import { startedFromStandardPosition } from '@/lib/games/standard-start';
import { captureError } from '@/lib/sentry/capture-error';

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

/** Exported for tests building a `RankEvalContext` directly. */
export function bestScoreCacheKey(menuType: string, leaderboardKey: string): string {
  return `${menuType}:${leaderboardKey}`;
}

// ---------------------------------------------------------------------------
// Per-pass evaluation context
// ---------------------------------------------------------------------------

type WonPublicGameRow = {
  playSettings: GamePlaySettings | null;
  playSettingsLog: PlaySettingsChangeEntry[] | null;
  operationLogs: MoveOperationLog[] | null;
  operationTotals: OperationTotals | null;
  // Together these reconstruct the position the game actually started from —
  // read by the 1dan evaluator, which requires a standard start (see
  // `startedFromStandardPosition`). `game_publish_win` (1kyu) ignores them.
  startingFen: string | null;
  setupPlies: number | null;
};

type RankEvalContext = {
  userId: string;
  getBestScore(menuType: string, leaderboardKey: string): number | undefined;
  /** Lazy + memoized: both game evaluators filter this single fetch in TS. */
  getWonPublicGames(): Promise<WonPublicGameRow[]>;
};

/**
 * Build the per-pass context `checkAndGrantRanks` shares across every rank
 * it evaluates. Exported so tests can exercise `evaluateRankRequirements`
 * directly without duplicating this wiring.
 */
export function createRankEvalContext(userId: string, scoreCache: BestScoreCache): RankEvalContext {
  let wonPublicGames: Promise<WonPublicGameRow[]> | null = null;

  return {
    userId,
    getBestScore: (menuType, leaderboardKey) =>
      scoreCache.get(bestScoreCacheKey(menuType, leaderboardKey)),
    getWonPublicGames: () => {
      wonPublicGames ??= db
        .select({
          playSettings: games.playSettings,
          playSettingsLog: games.playSettingsLog,
          operationLogs: games.operationLogs,
          operationTotals: games.operationTotals,
          startingFen: games.startingFen,
          setupPlies: games.setupPlies,
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
      return wonPublicGames;
    },
  };
}

// ---------------------------------------------------------------------------
// Evaluators — one per requirement type
// ---------------------------------------------------------------------------

type RequirementEvaluator<T extends RankRequirement = RankRequirement> = (
  ctx: RankEvalContext,
  requirement: T
) => Promise<boolean>;

/**
 * Mapped over `RankRequirement['type']` so adding a new requirement type to
 * the union without adding an evaluator here is a compile error, not a
 * silent runtime miss.
 */
type EvaluatorRegistry = {
  [K in RankRequirement['type']]: RequirementEvaluator<Extract<RankRequirement, { type: K }>>;
};

const evaluators: EvaluatorRegistry = {
  challenge_score: async (ctx, requirement: ChallengeScoreRequirement) => {
    const score = ctx.getBestScore(requirement.menuType, requirement.leaderboardKey);
    return score !== undefined && score >= requirement.minScore;
  },
  position_submission_count: async (ctx, requirement: PositionSubmissionCountRequirement) => {
    const [row] = await db
      .select({ value: count() })
      .from(positions)
      .where(
        and(eq(positions.userId, ctx.userId), inArray(positions.type, requirement.positionTypes))
      );
    return (row?.value ?? 0) >= requirement.minCount;
  },
  // The "was it constrained?" test reads a JSONB blob and is product logic
  // worth keeping honest and unit-tested, so it stays in TS rather than
  // becoming an un-indexable SQL predicate over `play_settings`. Only the
  // cheap, indexed half of the filter goes to the database (via
  // `getWonPublicGames`); the row set left over is one user's won games,
  // which is small.
  game_publish_win: async (ctx, requirement: GamePublishWinRequirement) => {
    const rows = await ctx.getWonPublicGames();
    const qualifying = rows.filter((row) => isConstrainedPlaySettings(row.playSettings));
    return qualifying.length >= requirement.minCount;
  },
  game_publish_win_hidden_board: async (ctx, requirement: GamePublishWinHiddenBoardRequirement) => {
    const rows = await ctx.getWonPublicGames();

    // Malformed / unverifiable data always disqualifies the game rather than
    // crashing or passing — a crash here would take down checkAndGrantRanks
    // for every future trigger of this user (the error is swallowed and only
    // reaches Sentry), permanently blocking promotion, and leniency would
    // promote on unverifiable logs.
    const qualifying = rows.filter((row) => {
      // 1dan is a black-belt-grade feat: the game must be played from the
      // standard initial position, or the "board hidden throughout" win is
      // meaningless (start one move from mate and play it). See
      // `startedFromStandardPosition`.
      if (!startedFromStandardPosition(row.startingFen, row.setupPlies)) return false;
      if (!maintainedHiddenBoard(row.playSettings, row.playSettingsLog)) return false;

      // Preferred source: the monotonic lifetime totals, which undo cannot
      // shrink — so peek → undo → replay counts every peek (issue #95).
      if (row.operationTotals != null) {
        if (!isOperationTotals(row.operationTotals)) return false;
        return row.operationTotals.peeks <= requirement.maxPeeks;
      }

      // Legacy rows published before operation_totals existed: only the
      // per-move log survives, and undo deleted log lines together with
      // their peekCount. A game with any recorded undo therefore has an
      // unverifiable peek total — fail closed on it.
      let peeks = 0;
      let undos = 0;
      for (const log of row.operationLogs ?? []) {
        if (typeof log?.peekCount !== 'number' || Number.isNaN(log.peekCount)) return false;
        if (typeof log?.undoCount !== 'number' || Number.isNaN(log.undoCount)) return false;
        peeks += log.peekCount;
        undos += log.undoCount;
      }
      return undos === 0 && peeks <= requirement.maxPeeks;
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
 */
export async function evaluateRankRequirements(
  ctx: RankEvalContext,
  requirements: RankRequirement[]
): Promise<boolean> {
  for (const req of requirements) {
    // Loose lookup (vs. the exhaustively-typed `evaluators` declaration)
    // because `req` here is a runtime union member, not a specific `K` — an
    // unrecognised `req.type` (e.g. stale seed data) must fail closed rather
    // than throw.
    const evaluate = (evaluators as Record<string, RequirementEvaluator>)[req.type];
    if (!evaluate) return false; // Unknown requirement type = fail
    const met = await evaluate(ctx, req);
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
  const ctx = createRankEvalContext(userId, scoreCache);

  // 2. Filter to unachieved ranks
  const unachievedRanks = allRanks.filter((r) => !achievedRankIds.has(r.id));

  // 3. For each unachieved rank (in level order), evaluate requirements
  for (const rank of unachievedRanks) {
    const requirements = parseRequirements(rank.requirements);
    if (requirements.length === 0) continue; // No requirements = skip

    const met = await evaluateRankRequirements(ctx, requirements);
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
    captureError(error, `Failed to check/grant ranks after ${context}`);
    return [];
  }
}
