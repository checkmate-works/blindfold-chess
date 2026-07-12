import { executeMove } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

export type Attempt = { move: string; isCorrect: boolean };

export type SessionState = {
  currentFen: string;
  playerMoves: string[];
  lockedSolutionIndex: number | null;
  attempts: Attempt[];
  /**
   * SAN of the opponent's most recent auto-played reply, or `null` before the
   * first player move.
   */
  lastOpponentMove: string | null;
};

/**
 * A solution line pre-split into all its SAN tokens and the subset of those
 * tokens that are the player's moves (the even indices 0, 2, 4, …).
 */
export type ParsedSolution = {
  moves: AlgebraicNotation[];
  playerSlots: AlgebraicNotation[];
};

/**
 * Pre-extract each solution's SAN tokens and player-move slots so per-submit
 * matching is O(solutions) rather than re-parsing on every keystroke.
 *
 * A puzzle's stored solution always starts with the player's move, so the
 * player's moves sit at indices 0, 2, 4, … and the opponent's replies at
 * 1, 3, 5, … — regardless of which side the puzzle is set up for.
 */
export function parseSolutionLines(solutions: PuzzleSolutionMove[][]): ParsedSolution[] {
  return solutions.map((line) => {
    const moves = line.map((m) => m.san) as AlgebraicNotation[];
    const playerSlots = moves.filter((_, i) => i % 2 === 0);
    return { moves, playerSlots };
  });
}

/** Context handed to the completion hook when the final move is accepted. */
export type SolveContext = {
  /** Space-separated SAN of the locked solution line. */
  solutionLine: string;
  /** Full attempt history including the final winning move. */
  attempts: Attempt[];
  /** Number of player slots in the solved line. */
  playerMoveCount: number;
};

/** A move's origin/destination squares, used to highlight it on the board. */
export type MoveSquares = { from: string; to: string };

export type PuzzleSubmitOutcome =
  /** The move was illegal or did not match any solution line. */
  | { kind: 'rejected'; nextSession: SessionState }
  /** The move matched; `solve` is non-null only on the puzzle's final move. */
  | {
      kind: 'accepted';
      nextSession: SessionState;
      solve: SolveContext | null;
      /** Squares of the player's just-accepted move (for the board highlight). */
      playerMove: MoveSquares;
      /**
       * Board FEN immediately after the player's move, before the opponent's
       * reply is applied — the frame shown while the reply reveal is pending.
       * Equals `nextSession.currentFen` when the line has no reply here.
       */
      fenAfterPlayer: string;
      /**
       * The opponent's auto-reply to reveal a beat after the player's move
       * (SAN + squares), or `null` when the line has no reply at this point
       * (e.g. the puzzle's final move).
       */
      opponentReply: { san: string; from: string; to: string } | null;
    };

/**
 * Pure puzzle move-matching engine. Given the current session, the typed SAN,
 * and the pre-parsed solution lines, decide whether the move is accepted and
 * compute the next session state (including the opponent's auto-reply).
 *
 * Both the user input and the stored solution SAN are canonicalized through
 * `executeMove` (chess.js) before comparison, so a user typing `Qe6` matches
 * a stored `Qxe6+`, and a solution stored without check decoration still
 * matches the canonical form. `executeMove` returning `null` on a stored SAN
 * means corrupted puzzle data — we fail closed (no match) rather than crash.
 *
 * Extracted from `PuzzleSessionClient.handleSubmit` so the matching logic is
 * unit-testable in isolation, separate from React state and feedback effects.
 */
export function evaluatePuzzleSubmit(
  session: SessionState,
  input: string,
  parsedSolutions: ParsedSolution[],
  solutions: PuzzleSolutionMove[][]
): PuzzleSubmitOutcome {
  const trimmed = input.trim();
  const nextPlayerIndex = session.playerMoves.length;

  // Run the input through chess.js: this is both the legality check and the
  // SAN normalization (fills in `x`, `+`, `#`). Illegal SAN → reject outright.
  const afterPlayer = executeMove(session.currentFen, trimmed);
  if (!afterPlayer) {
    const attempt: Attempt = { move: trimmed, isCorrect: false };
    return {
      kind: 'rejected',
      nextSession: { ...session, attempts: [...session.attempts, attempt] },
    };
  }

  const canonicalSan = afterPlayer.moveResult.san;

  // Which solution lines accept this move at the current player slot? Once a
  // line is locked, restrict to it; otherwise scan all.
  const candidates =
    session.lockedSolutionIndex !== null
      ? [session.lockedSolutionIndex]
      : parsedSolutions.map((_, i) => i);

  const matchIdx = candidates.find((i) => {
    const expected = parsedSolutions[i]!.playerSlots[nextPlayerIndex];
    if (expected === undefined) return false;
    const expectedExec = executeMove(session.currentFen, expected);
    return expectedExec !== null && expectedExec.moveResult.san === canonicalSan;
  });

  const attempt: Attempt = { move: trimmed, isCorrect: matchIdx !== undefined };
  const updatedAttempts = [...session.attempts, attempt];

  if (matchIdx === undefined) {
    return { kind: 'rejected', nextSession: { ...session, attempts: updatedAttempts } };
  }

  const locked = matchIdx;
  const solution = parsedSolutions[locked]!;
  const newPlayerMoves = [...session.playerMoves, trimmed];
  const playerMoveCount = newPlayerMoves.length;

  // Auto-play the opponent reply that follows this player move, if any. The
  // player's N-th move (1-indexed) is at SAN index (N-1)*2, the reply at +1.
  const opponentSanIndex = (playerMoveCount - 1) * 2 + 1;

  let fenAfter = afterPlayer.fen;
  let playedOpponentMove: string | null = null;
  let opponentReply: { san: string; from: string; to: string } | null = null;
  if (opponentSanIndex < solution.moves.length) {
    const opponentSan = solution.moves[opponentSanIndex]!;
    const afterOpponent = executeMove(fenAfter, opponentSan);
    if (afterOpponent) {
      fenAfter = afterOpponent.fen;
      playedOpponentMove = opponentSan;
      opponentReply = {
        san: opponentSan,
        from: afterOpponent.moveResult.from,
        to: afterOpponent.moveResult.to,
      };
    }
  }

  const solved = playerMoveCount >= solution.playerSlots.length;
  const nextSession: SessionState = {
    currentFen: fenAfter,
    playerMoves: newPlayerMoves,
    lockedSolutionIndex: locked,
    attempts: updatedAttempts,
    lastOpponentMove: playedOpponentMove,
  };

  return {
    kind: 'accepted',
    nextSession,
    solve: solved
      ? {
          solutionLine: solutions[locked]!.map((m) => m.san).join(' '),
          attempts: updatedAttempts,
          playerMoveCount: solution.playerSlots.length,
        }
      : null,
    playerMove: { from: afterPlayer.moveResult.from, to: afterPlayer.moveResult.to },
    fenAfterPlayer: afterPlayer.fen,
    opponentReply,
  };
}
