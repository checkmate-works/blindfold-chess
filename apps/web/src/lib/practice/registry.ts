/**
 * Single source of truth for practice modules (練習の種類).
 *
 * Each module's identity, URL slug, DB enum value, and feature flags
 * (challenge mode availability, leaderboard support) are declared here
 * once. `PRACTICE_MENU_TYPES`, `CHALLENGE_MENU_TYPES`, `MODULE_TO_SLUG`,
 * `SLUG_TO_MODULE` and the `PracticeMenuType` / `ChallengeMenuType` /
 * `LeaderboardModuleSlug` unions are all derived from the registry, so no
 * union or list elsewhere needs a new literal.
 *
 * ## Adding a practice module — the complete checklist
 *
 * The compiler reports the places marked (typed); the others are found only
 * by reading this list. Paths are under `src/` unless noted.
 *
 * Every module:
 *   1. Add an entry to {@link PRACTICE_MODULE_REGISTRY} below.
 *   2. `app/[locale]/(public)/practice/_lib/practice-emojis.ts` —
 *      `PRACTICE_EMOJIS` (typed: `Record<PracticeMenuType, string>`).
 *   3. `app/[locale]/(public)/practice/_lib/practice-catalog.ts` —
 *      `PRACTICE_CATALOG` drives the /practice list; an entry missing here is
 *      silently absent from the page (not typed).
 *   4. `app/[locale]/(public)/practice/_components/PracticeCardVisual.tsx` —
 *      the `switch (menuType)` that draws the card's picture (falls to
 *      `default`, not typed).
 *   5. The route directory, under a route group: challenge modules live in
 *      `app/[locale]/(public)/practice/(challenge)/<slug>/`, free-play ones in
 *      `.../practice/(free-play)/<slug>/` (copy `diagonal-quiz/` or
 *      `knight-tour/`). The setup page is `page.tsx`; sessions and results
 *      are `challenge/`, `training/`, `result/` beneath it. Shared session
 *      hooks come from `@blindfold-chess/features/practice-session` and the
 *      shared screens from `.../practice/_components/`.
 *   6. `messages/{en,es,ja,pt-BR}.json` — `practice.<camelCaseKey>.*` (all
 *      four locales; `messages/parity.test.ts` fails on a missing locale).
 *   7. `app/_lib/sitemap/static-pages.ts` — the `/practice/<slug>` entries
 *      (not typed).
 *   8. Pure game logic goes in `packages/features/src/<slug>/` with
 *      `package.json#exports` entries (see packages/features/CLAUDE.md).
 *   9. Optional nav/learn integration: `app/[locale]/_lib/practice-modules.ts`
 *      (`PRACTICE_MODULES`, a separate learn-side list) and
 *      `learn/_lib/types.ts` (`ARTICLE_PRACTICE_MAPPING`).
 *
 * Challenge modules (`hasChallenge: true`) additionally:
 *   10. `lib/db/leaderboard-key.ts` — a resolver in `CHALLENGE_KEY_RESOLVERS`
 *       (typed). Return `'default'` for modules with no settings-based
 *       segmentation, or derive the key from settings (`boardOrientation`
 *       for coordinate_quiz).
 *   11. `lib/games/leaderboard-keys.ts` — the key list in `LEADERBOARD_KEYS`
 *       (typed).
 *   12. `app/[locale]/(public)/leaderboard/_lib/types.ts` — a case in
 *       `buildChallengePath()` (typed: exhaustive switch). If the path carries
 *       the key as a query parameter, the module's challenge setup page must
 *       consume it: parse it in `page.tsx` from `searchParams` and pass it to
 *       `useQuerySeededSettings` in the setup component. The setup screens read
 *       their settings from storage, so a parameter nobody consumes is silently
 *       ignored and the button opens whatever the player last chose.
 *   13. `.../practice/(challenge)/<slug>/_actions/save-result.ts` — a
 *       `'use server'` file that wraps `createSaveResultAction(<menuType>)`
 *       from `(challenge)/_lib/create-save-result-action.ts` (copy
 *       `diagonal-quiz/_actions/save-result.ts`).
 *   14. The session component calls `useChallengeResultSave` from
 *       `(challenge)/_hooks/use-challenge-result-save.ts` with that action;
 *       the hook handles the single save, the granted-ranks stash and the
 *       redirect.
 *   15. `result/page.tsx` uses `createLeaderboardPracticeResultPage(ResultClient,
 *       { practiceId, module, resolveKey, loadingFallback })` instead of
 *       `createSimplePracticeResultPage` (copy `diagonal-quiz/result/page.tsx`).
 *   16. `packages/features/src/exp/constants.ts` — `MODULE_WEIGHT` (not typed;
 *       an absent module silently gets `DEFAULT_MODULE_WEIGHT`).
 *   17. `lib/db/data/achievements.ts` — `ACHIEVEMENT_DISPLAY_ORDER` (a
 *       compile-time set check against `CHALLENGE_MENU_TYPES` fails until the
 *       module is added).
 *   18. Tests with hard-coded counts: `leaderboard/_lib/__tests__/types.test.ts`,
 *       `leaderboard/_actions/__tests__/getUserRanks.test.ts`,
 *       `lib/db/leaderboard-key.test.ts`, `practice/_lib/practice-catalog.test.ts`.
 *
 * If a belt rank (段級位) should require a score in the module:
 *   19. `lib/db/data/ranks.ts` — a `challenge_score` entry in `ranksSeedData`
 *       (`menuType` is a plain string there, not typed).
 *   20. `messages/*.json` — `ranks.challengeNames.<key>` as built by
 *       `buildChallengeNameKey` in `dojo/ranks/_lib/requirement-items.ts`,
 *       which also has a hard-coded `legal_moves` / `route_planner` branch for
 *       modules whose requirement links to a challenge with a query parameter.
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
 * (`PracticeMenuType`, `PracticeModuleSlugKebab`, ...) are derived from
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
   * leaderboard URL segment.
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
    slugSnake: 'square_colors',
    slugKebab: 'square-colors',
    hasChallenge: true,
  },
  {
    slugSnake: 'coordinate_quiz',
    slugKebab: 'coordinate-quiz',
    hasChallenge: true,
  },
  { slugSnake: 'legal_moves', slugKebab: 'legal-moves', hasChallenge: true },
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
  { slugSnake: 'recall', slugKebab: 'recall', hasChallenge: false },
] as const satisfies readonly PracticeModuleRegistryEntry[];

// ---------------------------------------------------------------------------
// Slug type unions — derived from the registry literals so adding / removing
// an entry above is the only change required to update the union types.
// ---------------------------------------------------------------------------

type PracticeModuleRegistryEntryLiteral = (typeof PRACTICE_MODULE_REGISTRY)[number];

/** Snake_case identifier — used in DB rows (`practice_results.menu_type`) and as the key for emoji / leaderboard config records. */
export type PracticeMenuType = PracticeModuleRegistryEntryLiteral['slugSnake'];

/** Subset of PracticeMenuType that has a challenge mode (and consequently a leaderboard). */
export type ChallengeMenuType = Extract<
  PracticeModuleRegistryEntryLiteral,
  { hasChallenge: true }
>['slugSnake'];

/** Kebab-case slug for the modules that appear on the leaderboard (subset of ChallengeMenuType, same set, different casing). */
export type LeaderboardModuleSlug = Extract<
  PracticeModuleRegistryEntryLiteral,
  { hasChallenge: true }
>['slugKebab'];

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
  (m): m is Extract<PracticeModuleRegistryEntryLiteral, { hasChallenge: true }> => m.hasChallenge
).map((m) => m.slugSnake);

/** snake_case → kebab-case slug map for leaderboard modules. */
export const MODULE_TO_SLUG: Record<ChallengeMenuType, LeaderboardModuleSlug> = Object.fromEntries(
  PRACTICE_MODULE_REGISTRY.filter(
    (m): m is Extract<PracticeModuleRegistryEntryLiteral, { hasChallenge: true }> => m.hasChallenge
  ).map((m) => [m.slugSnake, m.slugKebab] as const)
) as Record<ChallengeMenuType, LeaderboardModuleSlug>;

/** kebab-case → snake_case slug map for leaderboard modules. */
export const SLUG_TO_MODULE: Record<LeaderboardModuleSlug, ChallengeMenuType> = Object.fromEntries(
  (Object.entries(MODULE_TO_SLUG) as [ChallengeMenuType, LeaderboardModuleSlug][]).map(
    ([snake, kebab]) => [kebab, snake] as const
  )
) as Record<LeaderboardModuleSlug, ChallengeMenuType>;
