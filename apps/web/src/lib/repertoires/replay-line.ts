import { parsePgn, replayMoves } from '@blindfold-chess/features/chess-core';
import {
  fullmoveNumberFromFen,
  isBlackToMoveFromFen,
} from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { MoveSquares } from '@/lib/board/move-squares';

export type ReplayedLine = {
  /** The line's moves (empty if the PGN failed to parse). */
  sans: AlgebraicNotation[];
  /** Board position at each ply; index 0 is the start, index k is after move k. */
  positions: { fen: string; lastMove: MoveSquares | null }[];
  /** Whether the root position has black to move (drives move numbering / labels). */
  startsAsBlack: boolean;
  /** Full-move number of the root position. */
  startMoveNumber: number;
};

/**
 * Replay a repertoire line server-side into the pieces every line view needs —
 * the SAN list, per-ply positions, and the root's side/number — so the board
 * viewers stay chess.js-free. Callers add the in-game `formatMovesToPgn`
 * formatting on top (kept app-side to avoid a lib → app import).
 */
export function replayRepertoireLine(line: {
  pgn: string;
  startingFen: string | null;
}): ReplayedLine {
  // A corrupt stored line replays as empty rather than failing the page.
  const parsed = parsePgn(line.pgn);
  const sans: AlgebraicNotation[] = parsed.ok ? parsed.value : [];
  const positions = replayMoves(sans, line.startingFen ?? undefined).map((p) => ({
    fen: p.fen,
    lastMove: p.lastMove ?? null,
  }));
  const startingFen = line.startingFen;
  const startsAsBlack = startingFen ? isBlackToMoveFromFen(startingFen) : false;
  const startMoveNumber = startingFen ? fullmoveNumberFromFen(startingFen) : 1;
  return { sans, positions, startsAsBlack, startMoveNumber };
}
