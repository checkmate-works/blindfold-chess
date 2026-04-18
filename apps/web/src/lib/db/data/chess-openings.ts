/**
 * Chess opening families seed data.
 *
 * Each entry contains the PGN and slug; the FEN is computed at seed time
 * via chess-core's getFenAfterMoves / parsePgn to keep this file free of
 * derived data that could drift from the PGN.
 *
 * Sources: ECO classification, lichess-org/chess-openings
 *
 * This module is the single public entry point for opening seed data.
 * The actual entries are split across `./openings/*.ts` files and
 * concatenated here in the exact same order as before the split.
 */
import type { ChessOpeningSeed } from './openings/_types';
import { openingsAdditionalD4 } from './openings/additional-d4';
import { openingsAdditionalE4 } from './openings/additional-e4';
import { openingsD4 } from './openings/d4';
import { openingsE4 } from './openings/e4';
import { openingsFlank } from './openings/flank';

export const chessOpenings: ChessOpeningSeed[] = [
  ...openingsE4,
  ...openingsD4,
  ...openingsFlank,
  ...openingsAdditionalE4,
  ...openingsAdditionalD4,
];
