import type {
  BoardTheme,
  PawnHideMode,
  PieceColorMode,
  PieceShapeMode,
} from "@blindfold-chess/types";

import type {
  AiReplyDuration,
  BoardVisibility,
  ButtonInputPieceLabel,
  MoveInputMode,
} from "./values";

/**
 * The player's global board and game preferences. Each platform stores its
 * own copy (web in localStorage, mobile in AsyncStorage) and the values are
 * not synced; what is shared is the shape, the defaults and the rules for
 * reading a stored copy back. A platform with no UI for a field still keeps
 * it, so the object is one type everywhere.
 */
export type GamePreferences = {
  // Board appearance
  /** Show rank and file labels on the board. */
  showCoordinates: boolean;
  /** Highlight the from / to squares of the last move. */
  highlightLastMove: boolean;
  /** Show legal destination squares when a piece is selected. */
  showPieceDestinations: boolean;
  /** Board colour theme. */
  boardTheme: BoardTheme;
  // Piece visibility
  /** Show the player's own pieces. */
  showOwnPieces: boolean;
  /** Show the opponent's pieces. */
  showOpponentPieces: boolean;
  // Piece appearance
  /** Draw pieces as stones instead of their shapes, for one side or both. */
  pieceShapeMode: PieceShapeMode;
  /** Force every piece to a single colour. */
  pieceColors: PieceColorMode;
  /** Hide pawns: none, both sides', own, or the opponent's. */
  pawnHideMode: PawnHideMode;
  // Move input
  /** Active move-input mode. */
  moveInputMode: MoveInputMode;
  /** Which move-input modes the mode switcher offers. */
  enabledMoveInputModes: MoveInputMode[];
  /** Whether the button keypad labels pieces with letters or icons. */
  buttonInputPieceLabel: ButtonInputPieceLabel;
  /** Suggest completions in the text input. */
  enableAutoComplete: boolean;
  /** How the board surfaces during gameplay. See {@link BoardVisibility}. */
  boardVisibility: BoardVisibility;
  /**
   * How long the AI's last move stays on screen in blindfold modes (ms;
   * `0` = until the next reply). See {@link AiReplyDuration}.
   */
  aiReplyDuration: AiReplyDuration;
};
