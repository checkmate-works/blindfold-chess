import type { ChallengeMenuType, PracticeMenuType } from './practice-menu-types';

/**
 * Derives the leaderboard segmentation key from module settings.
 *
 * Each practice module segments its leaderboard by a specific setting:
 *
 * - coordinate_quiz: boardOrientation — 'white', 'black', or 'random'.
 *   'random' means the board orientation is randomly chosen (white or black)
 *   for each question within a single session.
 *
 * - legal_moves: selectedPiece — 'king', 'queen', 'rook', 'bishop', 'knight', or 'random'.
 *   'random' means all piece types are randomly chosen for each question
 *   within a single session.
 *
 * - square_colors: always 'default' — this module has no configurable
 *   variant, so all sessions share a single leaderboard.
 *
 * - diagonal_quiz: always 'default' — no configurable variant.
 *
 * - board_symmetry: always 'default' — no configurable variant.
 */
/** Resolves one module's leaderboard segmentation key from its settings. */
type LeaderboardKeyResolver = (settings: Record<string, unknown>) => string | null;

/**
 * One resolver per challenge module.
 *
 * `satisfies Record<ChallengeMenuType, …>` is what makes this safe to grow:
 * `ChallengeMenuType` is derived from the `hasChallenge: true` entries of
 * `PRACTICE_MODULE_REGISTRY`, so registering a new challenge module without a
 * resolver here is a compile error. It used to be a `switch` with
 * `default: return null`, and that null reaches `savePracticeResult` as
 * `invalid_leaderboard_key` — every result for the new module discarded
 * behind a `console.warn`, with nothing failing at build time.
 */
const CHALLENGE_KEY_RESOLVERS = {
  coordinate_quiz: (settings) =>
    typeof settings.boardOrientation === 'string' ? settings.boardOrientation : null,
  legal_moves: (settings) =>
    typeof settings.selectedPiece === 'string' ? settings.selectedPiece : null,
  square_colors: () => 'default',
  diagonal_quiz: () => 'default',
  board_symmetry: () => 'default',
  route_planner: (settings) =>
    typeof settings.selectedPiece === 'string' ? settings.selectedPiece : null,
} as const satisfies Record<ChallengeMenuType, LeaderboardKeyResolver>;

export function deriveLeaderboardKey(
  menuType: PracticeMenuType,
  settings: Record<string, unknown>
): string | null {
  // Free-play modules have no leaderboard and no resolver — `null` for them
  // is the documented answer, not a missing case.
  const resolve: LeaderboardKeyResolver | undefined = (
    CHALLENGE_KEY_RESOLVERS as Record<string, LeaderboardKeyResolver>
  )[menuType];
  return resolve ? resolve(settings) : null;
}
