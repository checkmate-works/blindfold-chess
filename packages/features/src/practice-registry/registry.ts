/**
 * Single source of truth for practice modules (練習の種類), shared by the web
 * and mobile apps.
 *
 * Each module's identity, URL slug, DB enum value, and feature flags
 * (challenge mode availability, leaderboard support) are declared here
 * once. `PRACTICE_MENU_TYPES`, `CHALLENGE_MENU_TYPES`, `MODULE_TO_SLUG`,
 * `SLUG_TO_MODULE` and the `PracticeMenuType` / `ChallengeMenuType` /
 * `PracticeModuleSlug` / `LeaderboardModuleSlug` unions are all derived from
 * the registry, so no union or list elsewhere needs a new literal.
 *
 * The registry holds only what is the same on every platform. What each app
 * shows for a module (web: emoji, catalog card, routes; mobile: icon, i18n
 * namespace, stack screens) lives in that app, keyed by these slugs. The
 * complete checklist for adding a module, including those app-side tables,
 * is the TSDoc of `apps/web/src/lib/practice/registry.ts`.
 */

// ---------------------------------------------------------------------------
// Registry entries
// ---------------------------------------------------------------------------

/**
 * Shape constraint for entries in PRACTICE_MODULE_REGISTRY.
 *
 * Field types are intentionally widened (string / boolean) so that the
 * literal types of the registry entries are preserved by `as const` and
 * can flow into the derived unions below. The narrow literal unions
 * (`PracticeMenuType`, `PracticeModuleSlug`, ...) are derived from
 * the registry rather than defined here, so this type only enforces
 * the entry shape — not the slug values.
 */
export type PracticeModuleRegistryEntry = {
  /** snake_case DB identifier (also the emoji / leaderboard config key). */
  slugSnake: string;
  /**
   * kebab-case URL slug. For modules with a `/practice/<slug>/...` route
   * this is that route segment; for challenge modules without a dedicated
   * practice route (e.g. `route_planner`) the same slug is used as the
   * leaderboard URL segment. Mobile uses it as the route directory under
   * `(tabs)/practice/`.
   */
  slugKebab: string;
  /** Whether the module has a challenge mode that records to challenge_results / the leaderboard. */
  hasChallenge: boolean;
};

/**
 * Declaration order matches the historical `PRACTICE_MENU_TYPES` tuple.
 * Existing consumers of `PRACTICE_MENU_TYPES` only call `.includes()` on
 * it (no order-sensitive iteration), but preserving order keeps the
 * change behavior-neutral.
 *
 * Uses `as const satisfies` so that:
 *   - literal types are preserved (enables `(typeof ...)[number][...]` union derivation), and
 *   - each entry is still type-checked against `PracticeModuleRegistryEntry`.
 */
export const PRACTICE_MODULE_REGISTRY = [
  {
    slugSnake: "square_colors",
    slugKebab: "square-colors",
    hasChallenge: true,
  },
  {
    slugSnake: "coordinate_quiz",
    slugKebab: "coordinate-quiz",
    hasChallenge: true,
  },
  { slugSnake: "legal_moves", slugKebab: "legal-moves", hasChallenge: true },
  {
    slugSnake: "diagonal_quiz",
    slugKebab: "diagonal-quiz",
    hasChallenge: true,
  },
  {
    slugSnake: "board_symmetry",
    slugKebab: "board-symmetry",
    hasChallenge: true,
  },
  {
    slugSnake: "route_planner",
    slugKebab: "route-planner",
    hasChallenge: true,
  },
  {
    slugSnake: "position_memory",
    slugKebab: "position-memory",
    hasChallenge: false,
  },
  {
    slugSnake: "knight_tour",
    slugKebab: "knight-tour",
    hasChallenge: false,
  },
  {
    slugSnake: "algebraic_notation",
    slugKebab: "algebraic-notation",
    hasChallenge: false,
  },
  { slugSnake: "fen", slugKebab: "fen", hasChallenge: false },
  {
    slugSnake: "quadrant_anchors",
    slugKebab: "quadrant-anchors",
    hasChallenge: false,
  },
  { slugSnake: "puzzle", slugKebab: "puzzle", hasChallenge: false },
  { slugSnake: "recall", slugKebab: "recall", hasChallenge: false },
] as const satisfies readonly PracticeModuleRegistryEntry[];

// ---------------------------------------------------------------------------
// Slug type unions — derived from the registry literals so adding / removing
// an entry above is the only change required to update the union types.
// ---------------------------------------------------------------------------

type PracticeModuleRegistryEntryLiteral =
  (typeof PRACTICE_MODULE_REGISTRY)[number];

type ChallengeEntryLiteral = Extract<
  PracticeModuleRegistryEntryLiteral,
  { hasChallenge: true }
>;

/** Snake_case identifier — used in DB rows (`practice_results.menu_type`) and as the key for emoji / leaderboard config records. */
export type PracticeMenuType = PracticeModuleRegistryEntryLiteral["slugSnake"];

/** Kebab-case slug of every registered module (URL / route segment form). */
export type PracticeModuleSlug =
  PracticeModuleRegistryEntryLiteral["slugKebab"];

/** Subset of PracticeMenuType that has a challenge mode (and consequently a leaderboard). */
export type ChallengeMenuType = ChallengeEntryLiteral["slugSnake"];

/** Kebab-case slug for the modules that appear on the leaderboard (subset of ChallengeMenuType, same set, different casing). */
export type LeaderboardModuleSlug = ChallengeEntryLiteral["slugKebab"];

// ---------------------------------------------------------------------------
// Derived collections — these are the lists that other modules import.
// All are derived purely from PRACTICE_MODULE_REGISTRY so that adding /
// removing a module is a single-entry change here.
// ---------------------------------------------------------------------------

const CHALLENGE_ENTRIES = PRACTICE_MODULE_REGISTRY.filter(
  (m): m is ChallengeEntryLiteral => m.hasChallenge,
);

/** All practice menu types in DB-identifier (snake_case) form. Order matches the registry. */
export const PRACTICE_MENU_TYPES: readonly PracticeMenuType[] =
  PRACTICE_MODULE_REGISTRY.map((m) => m.slugSnake);

/** Subset that supports challenge mode + leaderboard, in DB-identifier form. */
export const CHALLENGE_MENU_TYPES: readonly ChallengeMenuType[] =
  CHALLENGE_ENTRIES.map((m) => m.slugSnake);

/** snake_case → kebab-case slug map for leaderboard modules. */
export const MODULE_TO_SLUG: Record<ChallengeMenuType, LeaderboardModuleSlug> =
  Object.fromEntries(
    CHALLENGE_ENTRIES.map((m) => [m.slugSnake, m.slugKebab] as const),
  ) as Record<ChallengeMenuType, LeaderboardModuleSlug>;

/** kebab-case → snake_case slug map for leaderboard modules. */
export const SLUG_TO_MODULE: Record<LeaderboardModuleSlug, ChallengeMenuType> =
  Object.fromEntries(
    (
      Object.entries(MODULE_TO_SLUG) as [
        ChallengeMenuType,
        LeaderboardModuleSlug,
      ][]
    ).map(([snake, kebab]) => [kebab, snake] as const),
  ) as Record<LeaderboardModuleSlug, ChallengeMenuType>;
