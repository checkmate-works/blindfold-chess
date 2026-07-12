/**
 * chess-core: The single entry point for all chess.js functionality.
 *
 * Design principle:
 *   chess.js must NOT be imported directly from apps (web, mobile, etc.).
 *   All chess.js usage must go through this module so that:
 *     - Chess logic remains platform-independent and reusable across apps.
 *     - The external dependency is isolated behind a stable, typed API.
 *     - Replacing or upgrading chess.js only requires changes here.
 */

export type { BoardPiece, Color, MoveResult } from "./types";

export { toMoveResult } from "./types";

export {
  validateFen,
  validateFenFormat,
  fenToBoard,
  fenToBoardFlat,
  boardFlatToFen,
  getTurnFromFen,
  isBlackToMoveFromFen,
  toPositionKey,
  getFenAfterMoves,
  getStartingFen,
  fenToLichessUrl,
  fenToPieceList,
} from "./fen";

export {
  validateMoveSequence,
  executeMove,
  getLegalMoves,
  movesToUci,
  uciToAlgebraic,
  getLastMoveDetails,
  replayMoves,
  getPlayerMovesFromSequence,
  isLegalPieceMove,
  findLegalMoveByCoords,
  findLegalMovesByCoords,
  isCheckmateFen,
} from "./moves";

export type {
  FormattedPgn,
  FormattedPgnMove,
  ParsedPgnMove,
  ParsedMoveSequence,
} from "./pgn";

export {
  validatePgn,
  parsePgn,
  parsePgnWithFen,
  generatePgn,
  validatePgnWithDetails,
  getPgnHeaders,
  getPgnHistory,
  formatPgnToText,
  getPgnSuggestion,
  parsePgnMoves,
  flattenPgnMoves,
  validatePgnMoves,
  parsePgnMoveSequence,
} from "./pgn";

export type { MoveTreeNode, PgnTree } from "./pgn-tree";
export { parsePgnTree, enumerateLines } from "./pgn-tree";

export type {
  Side,
  LineMatchStatus,
  LineDivergence,
  LineMatchResult,
  GameForMatch,
  LineMatchCandidate,
} from "./line-match";
export { matchGameToLine, matchGameAgainstLines } from "./line-match";

export type {
  OpeningEntry,
  OpeningIndex,
  OpeningMatch,
} from "./detect-opening";
export { buildOpeningIndex, detectOpening } from "./detect-opening";

export type {
  AttachedPgnError,
  ValidateAttachedPgnResult,
} from "./pgn-attachment";
export { validateAttachedPgn } from "./pgn-attachment";

export { validatePosition } from "./position";

export { formatLastMove } from "./format";

export { ChessGameManager } from "./game-manager";

export type { FenStructureResult } from "./validate-fen-structure";
export { validateFenStructure } from "./validate-fen-structure";

export type {
  FenSemanticReason,
  FenSemanticResult,
} from "./validate-fen-semantic";
export { validateFenSemantic } from "./validate-fen-semantic";
