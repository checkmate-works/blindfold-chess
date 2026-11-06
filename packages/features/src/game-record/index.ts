// Pure barrel — the saved-game record shared by web and mobile: its types,
// the guards that validate an untrusted copy of it, and the pure derivations
// over it. Storage (localStorage, AsyncStorage, the DB) stays in the apps.
export type {
  Game,
  GamePlaySettings,
  GameSortOption,
  MoveOperationLog,
  OperationTotals,
  PlaySettingsChangeEntry,
  PreferenceChangeLogEntry,
  SortDirection,
  StoredGame,
  UndoneMoveLog,
} from "./types";
export type { MoveInputMethod } from "./move-operation-log";
export {
  MOVE_INPUT_METHODS,
  isMoveOperationLog,
  isStringArray,
} from "./move-operation-log";
export type { GameStats, MoveMarker } from "./compute-game-stats";
export { computeGameStats, markerForLog } from "./compute-game-stats";
export type { IllegalAttemptSquares } from "./illegal-attempts";
export {
  parseAttemptSquares,
  resolveIllegalAttemptSquares,
} from "./illegal-attempts";
export {
  EMPTY_OPERATION_TOTALS,
  isOperationTotals,
  sumOperationLogs,
} from "./operation-totals";
export { MAX_UNDONE_LOGS, isUndoneMoveLog } from "./undone-logs";
export type { BlindfoldDisplayAxes } from "./play-settings-log";
export {
  foldBoardVisibility,
  gameUsedNotablePlaySettings,
  normalizePlaySettingsLog,
  playSettingsAreNotable,
  playSettingsAtHalfMove,
  resolvePlaySettingsChanges,
} from "./play-settings-log";
export {
  isConstrainedPlaySettings,
  maintainedHiddenBoard,
} from "./play-settings-constraint";
export { startedFromStandardPosition } from "./standard-start";
export type { HiddenBoardWinEvidence } from "./hidden-board-win";
export { qualifiesAsHiddenBoardWin } from "./hidden-board-win";
