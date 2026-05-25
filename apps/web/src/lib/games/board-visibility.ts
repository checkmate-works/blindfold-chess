/**
 * Three-state per-game flag describing how the chessboard surfaces to the
 * player during gameplay:
 *
 * - `'always'` — the board is always visible on the page. The blindfold
 *   experience is preserved (or graded down) through the visual settings
 *   (`pieceColors`, `pieceShapeMode`, `showOwnPieces`, `showOpponentPieces`)
 *   rather than through hiding the board entirely. This mode unlocks a
 *   "see-the-coordination-but-not-the-types" middle ground that is unique
 *   to this app's piece-obfuscation features.
 * - `'peek'` — the board is hidden by default; the player invokes a peek
 *   action to view it. Whether the peek surfaces as a modal popup or an
 *   inline accordion is governed by the orthogonal `peekMode` setting.
 * - `'never'` — the board is never shown. Pure blindfold mode.
 *
 * This replaces the prior boolean `showBoardButtonInGame`, which conflated
 * "is the board ever viewable?" with "is a peek button surfaced?" — a
 * conflation that left no room for the always-visible mode.
 */
export const BOARD_VISIBILITY_VALUES = ['always', 'peek', 'never'] as const;
export type BoardVisibility = (typeof BOARD_VISIBILITY_VALUES)[number];

/** Default for new sessions — preserves the historical behavior of "show a peek button". */
export const DEFAULT_BOARD_VISIBILITY: BoardVisibility = 'peek';

/**
 * Translate the legacy `showBoardButtonInGame: boolean` shape into the new
 * `boardVisibility: BoardVisibility` shape. The mapping is exact:
 * - `true`  → `'peek'`  (button was shown → peek is available)
 * - `false` → `'never'` (button was hidden → board was never shown)
 *
 * Used at every read boundary (localStorage validators, cookie decoder,
 * change-log normalisation) so the in-memory representation never sees the
 * legacy boolean. `'always'` cannot arise from migration — it only enters
 * the system through an explicit user choice after this phase ships.
 */
export function legacyToBoardVisibility(showBoardButtonInGame: boolean): BoardVisibility {
  return showBoardButtonInGame ? 'peek' : 'never';
}

/** Type guard for runtime validators reading data from disk / cookies. */
export function isBoardVisibility(value: unknown): value is BoardVisibility {
  return (
    typeof value === 'string' && (BOARD_VISIBILITY_VALUES as readonly string[]).includes(value)
  );
}
