import { parsePgn, replayMoves } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

export type ReplayedLine = {
  /** The line's moves (empty if the PGN failed to parse). */
  sans: AlgebraicNotation[];
  /** Board position at each ply; index 0 is the start, index k is after move k. */
  positions: { fen: string; lastMove: { from: string; to: string } | null }[];
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
  let sans: AlgebraicNotation[] = [];
  try {
    sans = parsePgn(line.pgn);
  } catch {
    sans = [];
  }
  const positions = replayMoves(sans, line.startingFen ?? undefined).map((p) => ({
    fen: p.fen,
    lastMove: p.lastMove ?? null,
  }));
  const startField = line.startingFen?.split(' ');
  const startsAsBlack = startField?.[1] === 'b';
  const startMoveNumber = startField ? Number(startField[5]) || 1 : 1;
  return { sans, positions, startsAsBlack, startMoveNumber };
}
