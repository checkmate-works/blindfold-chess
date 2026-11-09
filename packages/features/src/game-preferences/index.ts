// Pure barrel — the global board / game preferences shared by web and mobile:
// the type, its value sets, the defaults and the stored-payload sanitiser.
// Storage (localStorage, AsyncStorage, cookies) stays in the apps.
export type { GamePreferences } from "./types";
export type {
  AiReplyDuration,
  BoardVisibility,
  ButtonInputPieceLabel,
  MoveInputMode,
} from "./values";
export {
  AI_REPLY_DURATION_KEEP,
  AI_REPLY_DURATION_VALUES,
  BOARD_VISIBILITY_VALUES,
  BUTTON_INPUT_PIECE_LABELS,
  DEFAULT_AI_REPLY_DURATION,
  DEFAULT_BOARD_THEME,
  DEFAULT_BOARD_VISIBILITY,
  DEFAULT_ENABLED_MOVE_INPUT_MODES,
  DEFAULT_MOVE_INPUT_MODE,
  MOVE_INPUT_MODES,
  isAiReplyDuration,
  isBoardVisibility,
  legacyToBoardVisibility,
} from "./values";
export { DEFAULT_GAME_PREFERENCES } from "./defaults";
export {
  resolveStoredGamePreferences,
  validateGamePreferences,
} from "./validation";
