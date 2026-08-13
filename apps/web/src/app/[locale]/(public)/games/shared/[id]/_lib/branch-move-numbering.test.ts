import { formatMovesToPgn } from '@blindfold-chess/features/chess-core';
import { computeMoveNumber } from '@blindfold-chess/features/chess-core/move-numbering';
import { describe, expect, it } from 'vitest';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';

/**
 * `MoveReferencePreviewModal` renumbers a quoted branch against the game's
 * clock before handing it to `HorizontalMoveList`. This used to be
 * `formatPlyLabel` per move; the list needs `FormattedPgnMove[]` instead, so
 * the numbering now goes through `computeMoveNumber` + `formatMovesToPgn`.
 *
 * These pin that translation. The move-number base is invisible in the happy
 * path (a run quoted from ply 0 numbers itself 1, 2, 3 either way) — it only
 * shows up mid-game, which is exactly where a regression would hide.
 */
function branchPgn(sans: string[], basePly: number, startingFen: string | null) {
  const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
  const base = computeMoveNumber(basePly, startsAsBlack, startMoveNumber);
  return formatMovesToPgn(sans, !base.isWhiteMove, base.moveNumber);
}

describe('move-reference branch numbering', () => {
  it('numbers a run quoted from the start of a standard game as 1., 2., 3.', () => {
    expect(branchPgn(['e4', 'e5', 'Nf3'], 0, null)).toEqual([
      { moveNumber: 1, whiteMove: 'e4', whiteMoveIndex: 0, blackMove: 'e5', blackMoveIndex: 1 },
      { moveNumber: 2, whiteMove: 'Nf3', whiteMoveIndex: 2, blackMove: undefined },
    ]);
  });

  it("keeps the game's clock for a run quoted mid-game on white's move", () => {
    // ply 14 == white's 8th move of a standard game.
    const pgn = branchPgn(['Bd3', 'Bb7', 'O-O'], 14, null);

    expect(pgn[0]).toMatchObject({ moveNumber: 8, whiteMove: 'Bd3', whiteMoveIndex: 0 });
    expect(pgn[0]).toMatchObject({ blackMove: 'Bb7', blackMoveIndex: 1 });
    expect(pgn[1]).toMatchObject({ moveNumber: 9, whiteMove: 'O-O', whiteMoveIndex: 2 });
  });

  it("opens on a black move when the run is quoted from black's turn (8...Nf6)", () => {
    // ply 15 == black's reply to white's 8th.
    const pgn = branchPgn(['Nf6', 'O-O'], 15, null);

    expect(pgn[0]).toMatchObject({ moveNumber: 8, blackMove: 'Nf6', blackMoveIndex: 0 });
    expect(pgn[0].whiteMove).toBeUndefined();
    // Index 1, not 2: indices count within the branch, not the game.
    expect(pgn[1]).toMatchObject({ moveNumber: 9, whiteMove: 'O-O', whiteMoveIndex: 1 });
  });

  it("honours a custom starting FEN's fullmove counter and side to move", () => {
    // Black to move, fullmove 24 → the first quoted move is 24...Kf7.
    const pgn = branchPgn(['Kf7', 'a7'], 0, '8/5k2/8/8/8/8/P7/6K1 b - - 0 24');

    expect(pgn[0]).toMatchObject({ moveNumber: 24, blackMove: 'Kf7', blackMoveIndex: 0 });
    expect(pgn[1]).toMatchObject({ moveNumber: 25, whiteMove: 'a7', whiteMoveIndex: 1 });
  });

  it('indexes every move by its offset within the branch, not the game', () => {
    // The indices are the cursor space useMoveNavigation is scoped to, so they
    // must stay 0-based regardless of how deep into the game the run sits.
    const pgn = branchPgn(['Bd3', 'Bb7', 'O-O', 'Nc6'], 30, null);
    const indices = pgn
      .flatMap((m) => [m.whiteMoveIndex, m.blackMoveIndex])
      .filter((i) => i !== undefined);

    expect(indices).toEqual([0, 1, 2, 3]);
  });
});
