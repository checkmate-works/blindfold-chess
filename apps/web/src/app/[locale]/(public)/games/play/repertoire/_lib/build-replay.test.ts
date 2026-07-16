import { replayMoves } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { describe, expect, it } from 'vitest';

import { buildKataReplayModel } from './build-replay';

/** FEN of the position BEFORE game move `ply` (what LineDivergence carries). */
function fenBefore(moves: string[], ply: number): string {
  return replayMoves(moves as AlgebraicNotation[], undefined)[ply].fen;
}

describe('buildKataReplayModel', () => {
  it('stops one ply PAST the diverging move so the board shows it played', () => {
    // White deviates at ply 2: 2. Nc3 where the kata prepares 2. Nf3.
    const moves = ['e4', 'c5', 'Nc3', 'd6', 'd4'];
    const model = buildKataReplayModel({
      result: {
        status: 'deviation',
        enteredAtPly: 0,
        followedPlies: 2,
        divergence: {
          ply: 2,
          fen: fenBefore(moves, 2),
          side: 'white',
          played: 'Nc3',
          expected: ['Nf3'],
        },
      },
      moves,
      repertoireStartingFen: null,
    });

    expect(model.stopPly).toBe(3);
    // positions[3] is the position AFTER Nc3 — the diverging move on the board.
    expect(model.positions[3].lastMove).toEqual({ from: 'b1', to: 'c3' });
    expect(model.verdict).toEqual({
      status: 'deviation',
      moveNo: 2,
      played: 'Nc3',
      expected: 'Nf3',
    });
  });

  it('cuts the candidate line at the diverging move, not the end of the game', () => {
    // Black's 2... e6 is uncovered (gap); the game then continues 3. d4 etc.
    // — none of which belongs in the offered line.
    const moves = ['e4', 'c5', 'Nf3', 'e6', 'd4', 'd5', 'e5'];
    const model = buildKataReplayModel({
      result: {
        status: 'gap',
        enteredAtPly: 0,
        followedPlies: 3,
        divergence: {
          ply: 3,
          fen: fenBefore(moves, 3),
          side: 'black',
          played: 'e6',
          expected: ['d6', 'Nc6'],
        },
      },
      moves,
      repertoireStartingFen: null,
    });

    expect(model.stopPly).toBe(4);
    expect(model.addLinePgn).toBe('1. e4 c5 2. Nf3 e6');
    expect(model.verdict.expected).toBe('d6 / Nc6');
  });

  it('offers nothing to add for an in-book run and stops at the end of the matched book', () => {
    const moves = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4'];
    const model = buildKataReplayModel({
      result: { status: 'in-book', enteredAtPly: 0, followedPlies: 4 },
      moves,
      repertoireStartingFen: null,
    });

    expect(model.stopPly).toBe(4);
    expect(model.addLinePgn).toBeNull();
    expect(model.verdict).toEqual({ status: 'in-book', moveNo: null });
  });

  it("formats the candidate line against the repertoire's own root, from the entry ply", () => {
    // A kata rooted after 1. d4 (black to move): the game reaches that root at
    // ply 1, so the offered line starts there — "1... d5" — not at the game's
    // own first move.
    const moves = ['d4', 'd5', 'c4'];
    const repertoireStartingFen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPPPPPPP/RNBQKBNR b KQkq d3 0 1';
    const model = buildKataReplayModel({
      result: {
        status: 'deviation',
        enteredAtPly: 1,
        followedPlies: 1,
        divergence: {
          ply: 2,
          fen: fenBefore(moves, 2),
          side: 'white',
          played: 'c4',
          expected: ['Nf3'],
        },
      },
      moves,
      repertoireStartingFen,
    });

    expect(model.addLinePgn).toBe('1... d5 2. c4');
    // The board itself still replays the whole game from ITS start.
    expect(model.positions).toHaveLength(4);
  });
});
