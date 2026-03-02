/**
 * Re-exports from @blindfold-chess/features/chess-core.
 *
 * App-level code should gradually migrate to importing directly from
 * '@blindfold-chess/features/chess-core'. This file remains as a
 * convenience barrel so that existing consumers keep working.
 */
export {
  flattenPgnMoves as flattenMoves,
  getFenAfterMoves as getFenAfterMoves,
  getPlayerMovesFromSequence as getPlayerMoves,
  parsePgnMoveSequence as parseMoveSequence,
  parsePgnMoves,
  validatePgnMoves as validateMoves,
} from '@blindfold-chess/features/chess-core';
