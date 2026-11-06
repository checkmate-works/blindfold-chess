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
