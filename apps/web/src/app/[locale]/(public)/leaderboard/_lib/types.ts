import type { RankedLeaderboardRow } from '@/lib/db/challenge-queries';
import { LEADERBOARD_KEYS } from '@/lib/games/leaderboard-keys';
import {
  CHALLENGE_MENU_TYPES,
  type ChallengeMenuType,
  MODULE_TO_SLUG as REGISTRY_MODULE_TO_SLUG,
  SLUG_TO_MODULE as REGISTRY_SLUG_TO_MODULE,
  type LeaderboardModuleSlug as RegistryLeaderboardModuleSlug,
} from '@/lib/practice/registry';

export type LeaderboardPeriod = 'all-time' | 'weekly' | 'monthly';

/** Re-exported from the registry so existing leaderboard-side imports keep working. */
export type LeaderboardModule = ChallengeMenuType;
export type LeaderboardModuleSlug = RegistryLeaderboardModuleSlug;

export type ModuleFilterValue = 'all' | LeaderboardModule;

export type LeaderboardRow = RankedLeaderboardRow;

export type LeaderboardResult = {
  rows: LeaderboardRow[];
  totalCount: number;
  currentUserRank: LeaderboardRow | null;
};

export type LeaderboardEntry = {
  module: LeaderboardModule;
  key: string;
};

export type UserRankInfo = {
  module: LeaderboardModule;
  key: string;
  rank: number;
};

/**
 * Modules that appear on the leaderboard, in display order. Derived from
 * `CHALLENGE_MENU_TYPES` (the registry's view of which modules are
 * challenge-enabled) — `as const satisfies` is replaced by a runtime cast
 * to a tuple type because the source array is built up from the registry.
 */
export const MODULES = CHALLENGE_MENU_TYPES as readonly LeaderboardModule[];

export const MODULE_KEYS = LEADERBOARD_KEYS;

export const VALID_PERIODS = [
  'all-time',
  'weekly',
  'monthly',
] as const satisfies readonly LeaderboardPeriod[];

/**
 * Module filter values for the leaderboard UI. `'all'` (cross-module view)
 * is prepended to the registry-derived module list.
 */
export const VALID_MODULE_FILTERS: readonly ModuleFilterValue[] = ['all', ...MODULES];

export const PAGE_SIZE = 20;

/** All leaderboard entries in display order */
export const ALL_LEADERBOARD_ENTRIES: LeaderboardEntry[] = MODULES.flatMap((module) =>
  MODULE_KEYS[module].map((key) => ({ module, key }))
);

// ---------------------------------------------------------------------------
// URL slug <-> DB module name conversion (re-exported from the registry).
// ---------------------------------------------------------------------------

export const MODULE_TO_SLUG: Record<LeaderboardModule, LeaderboardModuleSlug> =
  REGISTRY_MODULE_TO_SLUG;

export const SLUG_TO_MODULE: Record<LeaderboardModuleSlug, LeaderboardModule> =
  REGISTRY_SLUG_TO_MODULE;

/**
 * All valid module URL slugs (hyphenated form). Parallel to `VALID_MODULE_FILTERS`
 * (underscore form). Used by the path-segment-based module filter on the
 * category-first canonical route `/leaderboard/score/[period]/[module-slug]`.
 */
export const VALID_MODULE_SLUGS: readonly LeaderboardModuleSlug[] = MODULES.map(
  (m) => MODULE_TO_SLUG[m]
);

export function moduleToSlug(module: LeaderboardModule): LeaderboardModuleSlug {
  return MODULE_TO_SLUG[module];
}

export function slugToModule(slug: string): LeaderboardModule | null {
  return (SLUG_TO_MODULE as Record<string, LeaderboardModule>)[slug] ?? null;
}

/**
 * Build the canonical (category-first) leaderboard detail path. Callers
 * prepend `/${locale}` to produce a fully-qualified URL.
 *
 * Example: `buildDetailPath('weekly', 'legal_moves', 'knight')`
 *   → `/leaderboard/score/weekly/legal-moves/knight`
 */
export function buildDetailPath(
  period: LeaderboardPeriod,
  module: LeaderboardModule,
  key: string
): string {
  return `/leaderboard/score/${period}/${moduleToSlug(module)}/${key}`;
}

/**
 * Build the challenge page path for a given module and key.
 *
 * - coordinate_quiz + key → /practice/coordinate-quiz/challenge?orientation={key}
 * - legal_moves + key     → /practice/legal-moves/challenge?piece={key}
 * - square_colors + key   → /practice/square-colors/challenge
 */
export function buildChallengePath(module: LeaderboardModule, key: string): string {
  const slug = moduleToSlug(module);

  switch (module) {
    case 'coordinate_quiz':
      return `/practice/${slug}/challenge?orientation=${key}`;
    case 'legal_moves':
      return `/practice/${slug}/challenge?piece=${key}`;
    case 'square_colors':
      return `/practice/${slug}/challenge`;
    case 'diagonal_quiz':
      return `/practice/${slug}/challenge`;
    case 'board_symmetry':
      return `/practice/${slug}/challenge`;
    case 'route_planner':
      return `/practice/${slug}/challenge?piece=${key}`;
  }
}
