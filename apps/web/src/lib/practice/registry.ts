/**
 * Single source of truth for practice modules (練習の種類).
 *
 * Each module's identity, URL slug, DB enum value, and feature flags
 * (challenge mode availability, leaderboard support) are declared once, in
 * `packages/features/src/practice-registry/registry.ts`, so the web and
 * mobile apps read the same list. This file re-exports it so that web code
 * keeps importing from `@/lib/practice/registry`. `PRACTICE_MENU_TYPES`,
 * `CHALLENGE_MENU_TYPES`, `MODULE_TO_SLUG`, `SLUG_TO_MODULE` and the
 * `PracticeMenuType` / `ChallengeMenuType` / `LeaderboardModuleSlug` unions
 * are all derived from the registry, so no union or list elsewhere needs a
 * new literal.
 *
 * ## Adding a practice module — the complete checklist
 *
 * The compiler reports the places marked (typed); the others are found only
 * by reading this list. Paths are under `src/` unless noted.
 *
 * Every module:
 *   1. Add an entry to `PRACTICE_MODULE_REGISTRY` in
 *      `packages/features/src/practice-registry/registry.ts` (re-exported
 *      here). If the mobile app implements the module, also add it to
 *      `MOBILE_PRACTICE_MODULES` in
 *      `apps/mobile/src/navigation/practice-modules.ts` (typed: the slug must
 *      be a registered one), which drives the mobile practice list and stack.
 *   2. `app/[locale]/(public)/practice/_lib/practice-emojis.ts` —
 *      `PRACTICE_EMOJIS` (typed: `Record<PracticeMenuType, string>`).
 *   3. `app/[locale]/(public)/practice/_lib/practice-catalog.ts` —
 *      `PRACTICE_CATALOG` drives the /practice list (typed: a compile-time
 *      check names any registered `menuType` that is missing).
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

export {
  CHALLENGE_MENU_TYPES,
  MODULE_TO_SLUG,
  PRACTICE_MENU_TYPES,
  PRACTICE_MODULE_REGISTRY,
  SLUG_TO_MODULE,
} from '@blindfold-chess/features/practice-registry';
export type {
  ChallengeMenuType,
  LeaderboardModuleSlug,
  PracticeMenuType,
  PracticeModuleRegistryEntry,
  PracticeModuleSlug,
} from '@blindfold-chess/features/practice-registry';
