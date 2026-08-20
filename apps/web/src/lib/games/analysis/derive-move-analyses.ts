import {
  fullmoveNumberFromFen,
  getTurnFromFen,
  movesToUci,
  replayMoves,
  uciToAlgebraic,
} from '@blindfold-chess/features/chess-core';
import { type Result, err, ok } from '@blindfold-chess/features/utils';
import type { Side } from '@blindfold-chess/types';

import { classifyMove } from './classify-move';
import type { MoveAnalysis, PositionEvaluation } from './types';
import { EVAL_SCORE_LIMIT } from './types';

function clampScore(score: number): number {
  return Math.max(-EVAL_SCORE_LIMIT, Math.min(EVAL_SCORE_LIMIT, Math.round(score)));
}

/** Why {@link deriveMoveAnalyses} could not produce verdicts. */
export type DeriveMoveAnalysesError =
  /** The client sent a different number of evaluations than there are positions. */
  | { kind: 'length-mismatch'; expected: number; received: number }
  /** The stored move list does not replay — the game record is corrupt. */
  | { kind: 'replay-failed' };

/**
 * Derive per-move verdicts from client-supplied position evaluations and the
 * TRUSTED game record. Pure and server-safe — this is where the self-reported
 * engine numbers stop and recomputed facts begin (see the module TSDoc in
 * `./types`):
 *
 * - `san`, `color`, `moveNumber` come from replaying `moves` (never from the
 *   client payload).
 * - `cpLoss` is recomputed from the two scores in the mover's perspective and
 *   floored at 0; scores are clamped to the engine's saturation range.
 * - `bestMoveSan` is resolved by converting the client's UCI string against
 *   the replayed position — an illegal/garbled UCI simply yields null, it can
 *   never inject arbitrary text.
 * - A move that IS the engine's choice is forced to `cpLoss 0` / `best`, so
 *   depth noise can't grade the top move as an inaccuracy.
 *
 * @param evaluations one entry per position: `moves.length + 1` items, index
 *   i evaluating the position BEFORE `moves[i]`.
 *
 * Returns a {@link Result} rather than throwing: both failures are ordinary
 * outcomes of untrusted input, and they mean different things — a length
 * mismatch is a bad request (or a tampered payload), while a replay failure
 * means the stored game record itself is corrupt. As throws they were
 * indistinguishable in the caller's `catch`, and therefore in the logs.
 */
export function deriveMoveAnalyses(
  moves: string[],
  startingFen: string | undefined,
  evaluations: PositionEvaluation[]
): Result<MoveAnalysis[], DeriveMoveAnalysesError> {
  if (evaluations.length !== moves.length + 1) {
    return err({
      kind: 'length-mismatch',
      expected: moves.length + 1,
      received: evaluations.length,
    });
  }

  const positions = replayMoves(moves, startingFen);
  if (positions.length !== moves.length + 1) {
    return err({ kind: 'replay-failed' });
  }
  const playedUci = movesToUci(moves, startingFen);

  const analyses = moves.map((san, ply) => {
    const fenBefore = positions[ply].fen;
    const color: Side = getTurnFromFen(fenBefore) === 'w' ? 'white' : 'black';
    const evalBefore = clampScore(evaluations[ply].score);
    const evalAfter = clampScore(evaluations[ply + 1].score);

    const bestMoveUci = evaluations[ply].bestMoveUci;
    const playedBest = bestMoveUci !== undefined && bestMoveUci === playedUci[ply];

    const rawLoss = color === 'white' ? evalBefore - evalAfter : evalAfter - evalBefore;
    const cpLoss = playedBest ? 0 : Math.max(0, rawLoss);

    let bestMoveSan: string | null = null;
    if (bestMoveUci) {
      try {
        bestMoveSan = uciToAlgebraic(bestMoveUci, fenBefore);
      } catch {
        // Illegal / malformed UCI for this position — drop it rather than fail.
        bestMoveSan = null;
      }
    }

    return {
      ply,
      san,
      moveNumber: fullmoveNumberFromFen(fenBefore),
      color,
      evalBefore,
      evalAfter,
      cpLoss,
      bestMoveSan,
      judgment: classifyMove(cpLoss),
    };
  });

  return ok(analyses);
}
