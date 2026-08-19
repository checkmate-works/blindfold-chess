import type { LineMatchResult } from '@blindfold-chess/features/chess-core';
import {
  formatMovesToPgn,
  formatPgnToText,
  fullmoveNumberFromFen,
  replayMoves,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { MoveSquares } from '@/lib/board/move-squares';

// Relative on purpose (against the usual 2-levels-up @ alias rule): vitest's
// vite-node fails to apply the `@` alias to specifiers containing `[locale]` /
// `(public)`, and this module is under unit test.
import { parseFenMeta } from '../../_lib/fen-utils';
import type { MatchStatus } from './match-status';

/** What the playback arrives at: the verdict against the chosen kata. */
export type MatchVerdict = {
  status: MatchStatus;
  /** Full-move number of the divergence; null for a clean in-book run. */
  moveNo: number | null;
  /** SAN actually played at the divergence. */
  played?: string;
  /** Prepared alternatives at the divergence, pre-joined for display. */
  expected?: string;
};

export type ReplayModel = {
  /** Board position at each ply of the game; index 0 is the start. */
  positions: { fen: string; lastMove: MoveSquares | null }[];
  /**
   * The ply playback stops at: one past the divergence (so the board shows
   * the diverging move played, not the position before it) for deviation/gap,
   * the end of the matched book for in-book.
   */
  stopPly: number;
  verdict: MatchVerdict;
  /**
   * PGN of the line to offer as a new addition to the repertoire — the
   * matched prefix (from where the game entered the kata) through the
   * diverging move itself, NOT the rest of the game, which may wander
   * through middlegame/endgame moves no repertoire line wants. Formatted
   * against the repertoire's OWN root (not the game's), since that's the
   * line's actual starting position. Null for in-book: the game never left
   * ground the repertoire already covers, so there is nothing new to add.
   */
  addLinePgn: string | null;
};

/**
 * Derive everything the replay view renders from a match result — the ply
 * arithmetic lives here, as a pure function under test, because both of its
 * off-by-one traps have already bitten once: `divergence.ply` indexes the
 * diverging move itself (so `positions[ply]` is the position BEFORE it), and
 * the candidate line must stop AT that move, not run to the end of the game.
 */
export function buildReplayModel(args: {
  result: LineMatchResult;
  /** The full game's SAN moves. */
  moves: string[];
  /** The game's starting position; undefined for the standard start. */
  gameStartingFen?: string;
  /** The repertoire's root position; null for the standard start. */
  repertoireStartingFen: string | null;
}): ReplayModel {
  const { result, moves, gameStartingFen, repertoireStartingFen } = args;
  const status = result.status as MatchStatus;

  const positions = replayMoves(moves as AlgebraicNotation[], gameStartingFen).map((p) => ({
    fen: p.fen,
    lastMove: p.lastMove ?? null,
  }));

  const stopPly = result.divergence
    ? result.divergence.ply + 1
    : (result.enteredAtPly ?? 0) + result.followedPlies;

  const verdict: MatchVerdict = result.divergence
    ? {
        status,
        // The FEN before the diverging move carries the full-move number directly.
        moveNo: fullmoveNumberFromFen(result.divergence.fen),
        played: result.divergence.played,
        expected: result.divergence.expected.join(' / '),
      }
    : { status, moveNo: null };

  let addLinePgn: string | null = null;
  if (status !== 'in-book') {
    const lineMoves = moves.slice(result.enteredAtPly ?? 0, stopPly);
    const { startsAsBlack, startMoveNumber } = parseFenMeta(repertoireStartingFen);
    addLinePgn = formatPgnToText(
      formatMovesToPgn(lineMoves as AlgebraicNotation[], startsAsBlack, startMoveNumber)
    );
  }

  return { positions, stopPly, verdict, addLinePgn };
}
