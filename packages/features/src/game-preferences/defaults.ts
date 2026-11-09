import type { GamePreferences } from "./types";
import {
  DEFAULT_AI_REPLY_DURATION,
  DEFAULT_BOARD_THEME,
  DEFAULT_BOARD_VISIBILITY,
  DEFAULT_ENABLED_MOVE_INPUT_MODES,
  DEFAULT_MOVE_INPUT_MODE,
} from "./values";

/**
 * Preferences for a player who has never changed anything. The move-input
 * and board-visibility fields derive from the same constants the web's SSR
 * cookie hints default to, so a server-rendered skeleton and the client state
 * cannot disagree about a new player.
 */
export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  showCoordinates: true,
  highlightLastMove: true,
  showPieceDestinations: true,
  boardTheme: DEFAULT_BOARD_THEME,
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: "normal",
  pieceColors: "normal",
  pawnHideMode: "none",
  moveInputMode: DEFAULT_MOVE_INPUT_MODE,
  enabledMoveInputModes: [...DEFAULT_ENABLED_MOVE_INPUT_MODES],
  buttonInputPieceLabel: "icon",
  enableAutoComplete: true,
  boardVisibility: DEFAULT_BOARD_VISIBILITY,
  aiReplyDuration: DEFAULT_AI_REPLY_DURATION,
};
