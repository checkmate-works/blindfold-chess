// Pure barrel — blindfold board display rules and interactive-board input
// policy. No React, no DOM, no chess.js.
export type {
  BlindfoldDisplaySettings,
  DisplayablePiece,
  HiddenPieceStyle,
  PawnHideMode,
  PieceColor,
  PieceColorMode,
  PieceDisplay,
  PieceShapeMode,
} from "./types";
export {
  areDestinationsObscured,
  isBoardObfuscated,
  resolvePieceDisplay,
} from "./piece-display";
export type { BoardClickAction } from "./click-policy";
export { classifyBoardClick, classifyMoveAttempt } from "./click-policy";
export type { SquareHighlightType } from "./highlight";
export { resolveSquareHighlight } from "./highlight";
export { squareToBoardIndices } from "./coords";
