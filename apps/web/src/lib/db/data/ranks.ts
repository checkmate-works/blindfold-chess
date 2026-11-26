/**
 * Rank (kyu/dan) seed data.
 *
 * Each entry defines a rank in the belt system. Requirements are expressed
 * as an array of conditions that must ALL be met (implicit AND).
 *
 * Requirement types:
 * - challenge_score: user's best score in a specific challenge must meet minScore.
 *   menuType / leaderboardKey correspond to challenge_results columns.
 * - exam_problem: user must have passed one problem of a rank's exam (see
 *   {@link ExamProblemRequirement}). The server grades the answer and records
 *   the pass in `dojo_step_completions` as `exam:<rank>:<problem>`; the
 *   requirement is met when that row exists. 2kyu asks for both problems of
 *   its exam. It used to ask for posting a position-memory problem or a
 *   puzzle; that requirement type was removed outright (type, guard,
 *   evaluator, labels) rather than kept unused, because a retired type left in
 *   the union reads as one still in force, and a rank should not make the user
 *   create content for others.
 * - game_publish_win: user must have published minCount won engine games played
 *   under a blindfold constraint (see {@link GamePublishWinRequirement}).
 * - game_publish_win_hidden_board: like game_publish_win, but stricter — the
 *   board must stay hidden for the whole game (not just at the start) and
 *   peeking is capped (see {@link GamePublishWinHiddenBoardRequirement}).
 *
 * A requirement type the parser does not recognise is DROPPED, not failed — so
 * a rank seeded with only unknown requirements parses to `[]` and reads as
 * "conditions not defined yet", silently letting the progression walk past it.
 * A new type's guard and its seed data must therefore ship together.
 *
 * Level values use gaps (10, 20, ...) to allow future intermediate ranks
 * without renumbering.
 */
import { RANK_REQUIREMENTS } from '@blindfold-chess/features/dojo-ranks';
import type {
  ChallengeScoreRequirement,
  ExamProblemRequirement,
  GamePublishWinHiddenBoardRequirement,
  GamePublishWinRequirement,
  RankRequirement,
} from '@blindfold-chess/features/dojo-ranks';

export type {
  ChallengeScoreRequirement,
  ExamProblemRequirement,
  GamePublishWinRequirement,
  GamePublishWinHiddenBoardRequirement,
  RankRequirement,
} from '@blindfold-chess/features/dojo-ranks';

type RankSeed = {
  slug: string;
  level: number;
  color: string;
  requirements: RankRequirement[];
};

/**
 * All rank slugs in progression order (lowest to highest).
 * Used by the ranks page to determine which ranks are "Coming Soon".
 *
 * Mukyu (無級 — "no rank") is included at the start as the default rank.
 * @see {@link MUKYU_SLUG} for the business logic rationale.
 */
export const ALL_RANK_SLUGS = ['mukyu', '5kyu', '4kyu', '3kyu', '2kyu', '1kyu', '1dan'] as const;

export type RankSlug = (typeof ALL_RANK_SLUGS)[number];

/**
 * The `level` at which the dan tier begins (1dan = 110; kyū ranks are ≤50).
 *
 * Holding any rank at or above this level carries the dan perk: permanent
 * ad-free browsing (see `hasDanTierRank` / `hasAdFreeEntitlement`). Defined
 * as a level threshold rather than a slug list so future dan ranks (2dan,
 * 3dan, …) inherit the perk without code changes — they will all seed with
 * `level >= 110` per the numbering scheme above.
 *
 * `user_ranks` is INSERT-only (ranks are never revoked), so crossing this
 * threshold is a one-way, permanent entitlement.
 */
export const DAN_TIER_MIN_LEVEL = 110;

/** Belt colors for each rank. */
export const RANK_COLORS: Record<RankSlug, string> = {
  mukyu: 'white',
  '5kyu': 'orange',
  '4kyu': 'blue',
  '3kyu': 'yellow',
  '2kyu': 'green',
  '1kyu': 'brown',
  '1dan': 'black',
};

// ---------------------------------------------------------------------------
// Type guard & parser (shared by rank-evaluation and UI)
// ---------------------------------------------------------------------------

export function isChallengeScoreRequirement(value: unknown): value is ChallengeScoreRequirement {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as Record<string, unknown>).type === 'challenge_score' &&
    'menuType' in value &&
    typeof (value as Record<string, unknown>).menuType === 'string' &&
    'leaderboardKey' in value &&
    typeof (value as Record<string, unknown>).leaderboardKey === 'string' &&
    'minScore' in value &&
    typeof (value as Record<string, unknown>).minScore === 'number'
  );
}

/**
 * An `exam_problem` requirement names an earned rank's exam (never Mukyu,
 * which has no exam) and one of the two problem kinds. Any other shape is
 * dropped by {@link parseRequirements}.
 */
export function isExamProblemRequirement(value: unknown): value is ExamProblemRequirement {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === 'exam_problem' &&
    typeof record.exam === 'string' &&
    record.exam !== 'mukyu' &&
    (ALL_RANK_SLUGS as readonly string[]).includes(record.exam) &&
    (record.problem === 'position_memory' || record.problem === 'puzzle')
  );
}

export function isGamePublishWinRequirement(value: unknown): value is GamePublishWinRequirement {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.type === 'game_publish_win' && typeof record.minCount === 'number';
}

export function isGamePublishWinHiddenBoardRequirement(
  value: unknown
): value is GamePublishWinHiddenBoardRequirement {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === 'game_publish_win_hidden_board' &&
    typeof record.minCount === 'number' &&
    typeof record.maxPeeks === 'number'
  );
}

function isRankRequirement(value: unknown): value is RankRequirement {
  return (
    isChallengeScoreRequirement(value) ||
    isExamProblemRequirement(value) ||
    isGamePublishWinRequirement(value) ||
    isGamePublishWinHiddenBoardRequirement(value)
  );
}

/**
 * Narrow a `ranks.requirements` JSONB value to known requirement shapes.
 *
 * Never throws: a non-array yields `[]`, and an element with an unknown
 * `type` or a malformed field is silently dropped (see the module header for
 * why that makes a rank read as "conditions not defined yet").
 */
export function parseRequirements(raw: unknown): RankRequirement[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRankRequirement);
}

// ---------------------------------------------------------------------------
// Belt color hex mapping (shared by ranks page and achievement modal)
// ---------------------------------------------------------------------------

/**
 * Map rank color names to CSS hex values.
 *
 * White (#ffffff) is used for Mukyu. UI components rendering this color
 * should add a border or outline for visibility against light backgrounds.
 */
export const BELT_COLOR_HEX: Record<string, string> = {
  white: '#ffffff',
  orange: '#f97316',
  blue: '#3b82f6',
  yellow: '#eab308',
  green: '#22c55e',
  brown: '#92400e',
  black: '#1c1917',
};

// ---------------------------------------------------------------------------
// Mukyu (無級 — "no rank") — UI-only default rank
// ---------------------------------------------------------------------------

/**
 * Mukyu (無級 — "no rank") is the default rank assigned to all users.
 *
 * @design UI-only, not stored in the database
 *
 * Unlike other ranks (5kyū–1dan), Mukyu is never inserted into the `ranks`
 * table or granted via `user_ranks`. It represents the starting state that
 * every user implicitly holds before earning their first rank through
 * challenge completion. Think of it as the "white belt" in martial arts.
 *
 * @design No requirements, no evaluation
 *
 * Mukyu has no requirements of any type and is never processed by
 * `checkAndGrantRanks`. Its presence in `ALL_RANK_SLUGS` is purely for
 * UI rendering on the ranks page and for generating static params / sitemap.
 *
 * @design Separate from "Coming Soon" ranks
 *
 * A seeded rank whose requirements are empty is displayed as "Coming Soon"
 * because its conditions haven't been defined yet (every rank in
 * {@link ranksSeedData} currently has conditions). Mukyu has no requirements
 * by design — it is always accessible and clickable.
 */
export const MUKYU_SLUG = 'mukyu' as const;

/** Check whether a given slug is the Mukyu (unranked) slug. */
export function isMukyuSlug(slug: string): slug is typeof MUKYU_SLUG {
  return slug === MUKYU_SLUG;
}

// ---------------------------------------------------------------------------
// GrantedRank type (returned by checkAndGrantRanks, used by UI components)
// ---------------------------------------------------------------------------

export type GrantedRank = {
  slug: string;
  level: number;
  color: string | null;
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

export const ranksSeedData: RankSeed[] = [
  {
    slug: '5kyu',
    level: 10,
    color: RANK_COLORS['5kyu'],
    requirements: [...structuredClone(RANK_REQUIREMENTS['5kyu'])],
  },
  {
    slug: '4kyu',
    level: 20,
    color: RANK_COLORS['4kyu'],
    requirements: [...structuredClone(RANK_REQUIREMENTS['4kyu'])],
  },
  {
    slug: '3kyu',
    level: 30,
    color: RANK_COLORS['3kyu'],
    requirements: [...structuredClone(RANK_REQUIREMENTS['3kyu'])],
  },
  {
    slug: '2kyu',
    level: 40,
    color: RANK_COLORS['2kyu'],
    requirements: [...structuredClone(RANK_REQUIREMENTS['2kyu'])],
  },
  {
    slug: '1kyu',
    level: 50,
    color: RANK_COLORS['1kyu'],
    requirements: [...structuredClone(RANK_REQUIREMENTS['1kyu'])],
  },
  // Gap between 1kyu (50) and 1dan (110) is intentionally large to reserve
  // space for future intermediate ranks between kyū and dan tiers.
  {
    slug: '1dan',
    level: 110,
    color: RANK_COLORS['1dan'],
    requirements: [...structuredClone(RANK_REQUIREMENTS['1dan'])],
  },
];

// ---------------------------------------------------------------------------
// Level lookup / highest-rank resolution
// ---------------------------------------------------------------------------

/**
 * Rank slug → level, including the UI-only Mukyu at level 0.
 *
 * Derived from {@link ranksSeedData} (the source of truth for levels) rather
 * than from the `ranks` table, so pure/display code can order ranks without a
 * DB round-trip.
 */
export const RANK_LEVEL_BY_SLUG: ReadonlyMap<string, number> = new Map<string, number>([
  [MUKYU_SLUG, 0],
  ...ranksSeedData.map((seed): [string, number] => [seed.slug, seed.level]),
]);

/**
 * The highest-level slug among the ranks a user actually holds, or `null` when
 * they hold none (Mukyu).
 *
 * Skip-grants make a sparse rank set a normal state — a player can hold 1dan
 * with no kyū ranks at all, or 1kyu AND 1dan together — so "which rank is this
 * user?" has exactly one honest answer: the highest one they hold. Use this
 * anywhere users are placed into a SINGLE rank bucket (the admin rank
 * distribution chart and the rank filter behind it), so those buckets stay
 * disjoint and the chart's counts match the list it links into. Do NOT use it
 * where the question is "has this user earned rank X" (grant idempotency, the
 * entitlement checks) — that is membership, not bucketing.
 *
 * A slug with no known level (a DB rank absent from the seed data) sorts as
 * level 0, matching how the distribution chart has always treated it.
 */
export function resolveHighestRankSlug(slugs: Iterable<string>): string | null {
  let highestSlug: string | null = null;
  let highestLevel = -Infinity;
  for (const slug of slugs) {
    const level = RANK_LEVEL_BY_SLUG.get(slug) ?? 0;
    if (level > highestLevel) {
      highestLevel = level;
      highestSlug = slug;
    }
  }
  return highestSlug;
}
