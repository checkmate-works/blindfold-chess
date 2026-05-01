/**
 * Single source of truth for practice modules.
 *
 * Each module's identity, URL slug, DB enum value, and feature flags
 * (challenge mode availability, leaderboard support) are declared here
 * once and consumed by the various lists that used to be hand-maintained
 * across `lib/db/practice-menu-types.ts`,
 * `app/[locale]/_lib/practice-modules.ts`, and
 * `app/[locale]/(public)/leaderboard/_lib/types.ts`.
 *
 * To add a new practice module:
 *   1. Add an entry to PRACTICE_MODULE_REGISTRY below
 *   2. (If it has challenge/leaderboard) follow the steps in the
 *      "Adding Leaderboard Support to a Practice Module" section of
 *      apps/web/CLAUDE.md
 */

// ---------------------------------------------------------------------------
// Slug type unions (kept narrow so existing consumers' literal types continue
// to compile).
// ---------------------------------------------------------------------------

/** Snake_case identifier — used in DB rows (`practice_results.menu_type`) and as the key for emoji / leaderboard config records. */
export type PracticeMenuType =
  | 'coordinate_quiz'
  | 'legal_moves'
  | 'square_colors'
  | 'board_symmetry'
  | 'route_planner'
  | 'diagonal_quiz'
  | 'position_memory'
  | 'knight_tour'
  | 'algebraic_notation'
  | 'fen'
  | 'quadrant_anchors'
  | 'puzzle';

/** Subset of PracticeMenuType that has a challenge mode (and consequently a leaderboard). */
export type ChallengeMenuType =
  | 'square_colors'
  | 'legal_moves'
  | 'coordinate_quiz'
  | 'diagonal_quiz'
  | 'board_symmetry'
  | 'route_planner';

/** Kebab-case URL slug — used in `/practice/<slug>/...` routes (when present) and in leaderboard URLs (for challenge modules). */
export type PracticeModuleSlugKebab =
  | 'algebraic-notation'
  | 'coordinate-quiz'
  | 'diagonal-quiz'
  | 'fen'
  | 'knight-tour'
  | 'legal-moves'
  | 'position-memory'
  | 'square-colors'
  | 'board-symmetry'
  | 'route-planner'
  | 'quadrant-anchors'
  | 'puzzle';

/** Kebab-case slug for the modules that appear on the leaderboard (subset of ChallengeMenuType, same set, different casing). */
export type LeaderboardModuleSlug =
  | 'coordinate-quiz'
  | 'legal-moves'
  | 'square-colors'
  | 'diagonal-quiz'
  | 'board-symmetry'
  | 'route-planner';

// ---------------------------------------------------------------------------
// Registry entries
// ---------------------------------------------------------------------------

export type PracticeModuleRegistryEntry = {
  /** snake_case DB identifier (also the emoji / leaderboard config key). */
  slugSnake: PracticeMenuType;
  /**
   * kebab-case URL slug. For modules with a `/practice/<slug>/...` route
   * this is that route segment; for challenge modules without a dedicated
   * practice route (e.g. `route_planner`) the same slug is used as the
   * leaderboard URL segment.
   */
  slugKebab: PracticeModuleSlugKebab;
  /** Whether the module has a challenge mode that records to challenge_results / the leaderboard. */
  hasChallenge: boolean;
};

/**
 * Declaration order matches the historical `PRACTICE_MENU_TYPES` tuple.
 * Existing consumers of `PRACTICE_MENU_TYPES` only call `.includes()` on
 * it (no order-sensitive iteration), but preserving order keeps the
 * change behavior-neutral.
 */
export const PRACTICE_MODULE_REGISTRY: readonly PracticeModuleRegistryEntry[] = [
  {
    slugSnake: 'coordinate_quiz',
    slugKebab: 'coordinate-quiz',
    hasChallenge: true,
  },
  { slugSnake: 'legal_moves', slugKebab: 'legal-moves', hasChallenge: true },
  {
    slugSnake: 'square_colors',
    slugKebab: 'square-colors',
    hasChallenge: true,
  },
  {
    slugSnake: 'diagonal_quiz',
    slugKebab: 'diagonal-quiz',
    hasChallenge: true,
  },
  {
    slugSnake: 'board_symmetry',
    slugKebab: 'board-symmetry',
    hasChallenge: true,
  },
  {
    slugSnake: 'route_planner',
    slugKebab: 'route-planner',
    hasChallenge: true,
  },
  {
    slugSnake: 'position_memory',
    slugKebab: 'position-memory',
    hasChallenge: false,
  },
  {
    slugSnake: 'knight_tour',
    slugKebab: 'knight-tour',
    hasChallenge: false,
  },
  {
    slugSnake: 'algebraic_notation',
    slugKebab: 'algebraic-notation',
    hasChallenge: false,
  },
  { slugSnake: 'fen', slugKebab: 'fen', hasChallenge: false },
  {
    slugSnake: 'quadrant_anchors',
    slugKebab: 'quadrant-anchors',
    hasChallenge: false,
  },
  { slugSnake: 'puzzle', slugKebab: 'puzzle', hasChallenge: false },
] as const;

// ---------------------------------------------------------------------------
// Derived collections — these are the lists that other modules import.
// All are derived purely from PRACTICE_MODULE_REGISTRY so that adding /
// removing a module is a single-entry change here.
// ---------------------------------------------------------------------------

/** All practice menu types in DB-identifier (snake_case) form. Order matches the registry. */
export const PRACTICE_MENU_TYPES: readonly PracticeMenuType[] = PRACTICE_MODULE_REGISTRY.map(
  (m) => m.slugSnake
);

/** Subset that supports challenge mode + leaderboard, in DB-identifier form. */
export const CHALLENGE_MENU_TYPES: readonly ChallengeMenuType[] = PRACTICE_MODULE_REGISTRY.filter(
  (m): m is PracticeModuleRegistryEntry & { slugSnake: ChallengeMenuType } => m.hasChallenge
).map((m) => m.slugSnake);

/** snake_case → kebab-case slug map for leaderboard modules. */
export const MODULE_TO_SLUG: Record<ChallengeMenuType, LeaderboardModuleSlug> = Object.fromEntries(
  PRACTICE_MODULE_REGISTRY.filter(
    (m): m is PracticeModuleRegistryEntry & { slugSnake: ChallengeMenuType } => m.hasChallenge
  ).map((m) => [m.slugSnake, m.slugKebab as LeaderboardModuleSlug] as const)
) as Record<ChallengeMenuType, LeaderboardModuleSlug>;

/** kebab-case → snake_case slug map for leaderboard modules. */
export const SLUG_TO_MODULE: Record<LeaderboardModuleSlug, ChallengeMenuType> = Object.fromEntries(
  (Object.entries(MODULE_TO_SLUG) as [ChallengeMenuType, LeaderboardModuleSlug][]).map(
    ([snake, kebab]) => [kebab, snake] as const
  )
) as Record<LeaderboardModuleSlug, ChallengeMenuType>;
