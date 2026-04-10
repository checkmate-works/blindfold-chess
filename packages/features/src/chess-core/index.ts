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
  getTurnFromFen,
  isBlackToMoveFromFen,
  getFenAfterMoves,
  getStartingFen,
  fenToLichessUrl,
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

export type { PositionQuery } from "./position";

export {
  queryPosition,
  isCheckmate,
  isStalemate,
  isCheck,
  isDraw,
  isInsufficientMaterial,
  isGameOver,
  isSquareAttacked,
  findKingSquare,
  validatePosition,
} from "./position";

export { formatLastMove } from "./format";

export { ChessGameManager } from "./game-manager";
