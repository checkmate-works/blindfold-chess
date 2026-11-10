/**
 * The "was anything hidden" rules over a game's play settings moved to
 * `@blindfold-chess/features/game-record` with the saved-game record they read.
 * Re-exported here for the importers outside the games area (the rank
 * evaluator, the AI review context); new code imports the package.
 */
export {
  isConstrainedPlaySettings,
  maintainedHiddenBoard,
} from '@blindfold-chess/features/game-record';
