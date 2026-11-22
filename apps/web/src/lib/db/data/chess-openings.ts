/**
 * Chess opening families seed data.
 *
 * Each entry contains the PGN and slug; the FEN is computed at seed time
 * via chess-core's getFenAfterMoves / parsePgn to keep this file free of
 * derived data that could drift from the PGN.
 *
 * Sources: ECO classification, lichess-org/chess-openings
 *
 * The entries live in `@blindfold-chess/features/openings` so the mobile app
 * can read the same list; this module stays the web's entry point for them.
 */
import { CHESS_OPENINGS } from '@blindfold-chess/features/openings';
import type { ChessOpeningSeed } from '@blindfold-chess/features/openings';

export type { ChessOpeningSeed };

export const chessOpenings: ChessOpeningSeed[] = [...CHESS_OPENINGS];
