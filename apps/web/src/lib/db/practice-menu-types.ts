/**
 * Challenge-related type definitions.
 *
 * These types define the menu types that support challenge mode (with leaderboard).
 * The CHALLENGE_MENU_TYPES list is the subset of practice modules that have
 * challenge mode and store results in the challenge_results table.
 *
 * The actual definitions live in `@/lib/practice/registry` (the single
 * source of truth). This file is kept as a thin re-export so that existing
 * imports (`@/lib/db/practice-menu-types`) continue to work.
 */

export { CHALLENGE_MENU_TYPES, PRACTICE_MENU_TYPES } from '@/lib/practice/registry';
export type { ChallengeMenuType, PracticeMenuType } from '@/lib/practice/registry';
