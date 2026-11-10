/**
 * The 1dan hidden-board-win rule moved to `@blindfold-chess/features/game-record`
 * with the saved-game record it reads. Re-exported here for the importers
 * outside the games area (the rank evaluator); new code imports the package.
 */
export {
  type HiddenBoardWinEvidence,
  qualifiesAsHiddenBoardWin,
} from '@blindfold-chess/features/game-record';
