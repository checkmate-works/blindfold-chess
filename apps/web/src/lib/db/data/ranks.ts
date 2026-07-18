/**
 * Rank (kyu/dan) seed data.
 *
 * Each entry defines a rank in the belt system. Requirements are expressed
 * as an array of conditions that must ALL be met (implicit AND).
 *
 * Requirement types:
 * - challenge_score: user's best score in a specific challenge must meet minScore.
 *   menuType / leaderboardKey correspond to challenge_results columns.
 * - position_submission_count: user's total posts across `positionTypes` must
 *   meet minCount (OR across types, see {@link PositionSubmissionCountRequirement}).
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

export type ChallengeScoreRequirement = {
  type: 'challenge_score';
  menuType: string;
  leaderboardKey: string;
  minScore: number;
};

/**
 * Requires the user to have submitted at least `minCount` rows in the
 * `positions` table whose `type` is one of `positionTypes` (OR across
 * types — a `memory` post and a `puzzle` post count toward the same total).
 * Counted directly off `positions`, NOT off `exp_events` — submissions grant
 * points, not EXP, so the source of truth is the row count of the user's
 * authored positions.
 */
export type PositionSubmissionCountRequirement = {
  type: 'position_submission_count';
  positionTypes: readonly ('memory' | 'puzzle')[];
  minCount: number;
};

/**
 * Requires the user to have published at least one WON game against the engine
 * that was played under some blindfold constraint.
 *
 * Checked against `games` (every row there is an engine game — there is no
 * human-vs-human path into that table), so engine kind and strength are
 * deliberately not part of the condition: the rank is about playing without
 * full sight, not about beating a particular rating.
 *
 * "Under a constraint" is judged on the start-of-game settings snapshot alone —
 * see {@link isConstrainedPlaySettings}, which owns that predicate.
 *
 * The win is self-reported. `games.result` is not verified server-side (a game
 * can end in resignation or timeout, which a final-position check cannot
 * confirm — publish-time integrity is move legality, not outcome), so this
 * requirement inherits that posture.
 */
export type GamePublishWinRequirement = {
  type: 'game_publish_win';
  minCount: number;
};

/**
 * Requires the user to have published at least `minCount` WON games against
 * the engine that stayed under a blindfold constraint for the ENTIRE game,
 * with peeking capped at `maxPeeks`.
 *
 * Stricter than {@link GamePublishWinRequirement} in two ways:
 * - "Hidden" is judged on `boardVisibility` specifically (not the full
 *   {@link isConstrainedPlaySettings} constraint set), and it must hold at
 *   the start AND stay that way the whole game — checked against the
 *   self-reported `games.play_settings_log`, not just the start snapshot.
 *   See {@link maintainedHiddenBoard}, which owns that predicate.
 * - The total `peekCount` across the game's self-reported `operationLogs`
 *   must not exceed `maxPeeks`.
 *
 * Like `game_publish_win`, this inherits the app's self-reported posture:
 * `games.result`, `play_settings_log`, and `operation_logs` are all trusted
 * as-is (only move legality is verified server-side at publish time).
 */
export type GamePublishWinHiddenBoardRequirement = {
  type: 'game_publish_win_hidden_board';
  minCount: number;
  maxPeeks: number;
};

export type RankRequirement =
  | ChallengeScoreRequirement
  | PositionSubmissionCountRequirement
  | GamePublishWinRequirement
  | GamePublishWinHiddenBoardRequirement;

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

export function isPositionSubmissionCountRequirement(
  value: unknown
): value is PositionSubmissionCountRequirement {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === 'position_submission_count' &&
    Array.isArray(record.positionTypes) &&
    record.positionTypes.length > 0 &&
    record.positionTypes.every((t) => t === 'memory' || t === 'puzzle') &&
    typeof record.minCount === 'number'
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
    isPositionSubmissionCountRequirement(value) ||
    isGamePublishWinRequirement(value) ||
    isGamePublishWinHiddenBoardRequirement(value)
  );
}

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
 * Mukyu has no `challenge_score` requirements and is never processed by
 * `checkAndGrantRanks`. Its presence in `ALL_RANK_SLUGS` is purely for
 * UI rendering on the ranks page and for generating static params / sitemap.
 *
 * @design Separate from "Coming Soon" ranks
 *
 * Other ranks with empty requirements (4kyū–1dan) are displayed as "Coming Soon"
 * because their conditions haven't been defined yet. Mukyu has no requirements
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
    requirements: [
      {
        type: 'challenge_score',
        menuType: 'square_colors',
        leaderboardKey: 'default',
        minScore: 15,
      },
      {
        type: 'challenge_score',
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        minScore: 20,
      },
    ],
  },
  {
    slug: '4kyu',
    level: 20,
    color: RANK_COLORS['4kyu'],
    requirements: [
      {
        type: 'challenge_score',
        menuType: 'legal_moves',
        leaderboardKey: 'king',
        minScore: 20,
      },
      {
        type: 'challenge_score',
        menuType: 'legal_moves',
        leaderboardKey: 'knight',
        minScore: 20,
      },
      {
        type: 'challenge_score',
        menuType: 'legal_moves',
        leaderboardKey: 'bishop',
        minScore: 10,
      },
    ],
  },
  {
    slug: '3kyu',
    level: 30,
    color: RANK_COLORS['3kyu'],
    requirements: [
      {
        type: 'challenge_score',
        menuType: 'route_planner',
        leaderboardKey: 'knight',
        minScore: 3,
      },
      {
        type: 'challenge_score',
        menuType: 'route_planner',
        leaderboardKey: 'bishop',
        minScore: 3,
      },
    ],
  },
  {
    slug: '2kyu',
    level: 40,
    color: RANK_COLORS['2kyu'],
    requirements: [
      {
        type: 'position_submission_count',
        positionTypes: ['memory', 'puzzle'],
        minCount: 1,
      },
    ],
  },
  {
    slug: '1kyu',
    level: 50,
    color: RANK_COLORS['1kyu'],
    requirements: [
      {
        type: 'game_publish_win',
        minCount: 1,
      },
    ],
  },
  // Gap between 1kyu (50) and 1dan (110) is intentionally large to reserve
  // space for future intermediate ranks between kyū and dan tiers.
  {
    slug: '1dan',
    level: 110,
    color: RANK_COLORS['1dan'],
    requirements: [
      {
        type: 'game_publish_win_hidden_board',
        minCount: 1,
        maxPeeks: 5,
      },
    ],
  },
];
