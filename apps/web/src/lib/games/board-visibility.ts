/**
 * The three-state board-visibility preference (`'always'` / `'peek'` /
 * `'never'`), its default, the legacy-boolean migration and the type guard.
 * They live in `@blindfold-chess/features/game-preferences`, where their
 * semantics are documented, so the mobile app reads stored preferences with
 * the same rules; this module re-exports them so web imports stay put.
 */
export {
  BOARD_VISIBILITY_VALUES,
  type BoardVisibility,
  DEFAULT_BOARD_VISIBILITY,
  isBoardVisibility,
  legacyToBoardVisibility,
} from '@blindfold-chess/features/game-preferences';
