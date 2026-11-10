/**
 * The per-position play-settings fold moved to
 * `@blindfold-chess/features/game-record` with the saved-game record it reads.
 * Re-exported here for the importers outside the games area (the embed page,
 * the AI review context); new code imports the package.
 */
export {
  type BlindfoldDisplayAxes,
  foldBoardVisibility,
  gameUsedNotablePlaySettings,
  normalizePlaySettingsLog,
  playSettingsAreNotable,
  playSettingsAtHalfMove,
  resolvePlaySettingsChanges,
} from '@blindfold-chess/features/game-record';
