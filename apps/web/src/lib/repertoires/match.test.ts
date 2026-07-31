import { parsePgnTree } from '@blindfold-chess/features/chess-core';
import { describe, expect, it } from 'vitest';

import {
  isRepertoireApplicableFromFirstMove,
  matchGameToRepertoire,
  mergeLineTrees,
} from './match';

// Two stored lines sharing the 1. e4 c5 2. Nf3 prefix, as the import
// decomposition would produce them from one PGN with a variation.
const NAJDORF_LINE = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6';
const SVESHNIKOV_LINE = '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e5';

describe('matchGameToRepertoire', () => {
  it('reports in-book when the game follows a stored line to its end', () => {
    const result = matchGameToRepertoire(
      {
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5'],
        playerColor: 'white',
      },
      [NAJDORF_LINE, SVESHNIKOV_LINE]
    );
    expect(result).not.toBeNull();
    expect(result?.status).toBe('in-book');
    expect(result?.followedPlies).toBe(10);
  });

  it('follows a sibling line instead of reporting a deviation at the branch', () => {
    // 2... Nc6 leaves the Najdorf line but stays inside the Sveshnikov one;
    // per-line matching would call this a deviation from line 1.
    const result = matchGameToRepertoire(
      { moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4'], playerColor: 'white' },
      [NAJDORF_LINE, SVESHNIKOV_LINE]
    );
    expect(result?.status).toBe('in-book');
    expect(result?.followedPlies).toBe(6);
  });

  it('merges branch alternatives into the expected list on a gap', () => {
    // White is on book; black (the opponent here) plays 2... e6, which neither
    // line prepares. Both prepared replies must be surfaced.
    const result = matchGameToRepertoire(
      { moves: ['e4', 'c5', 'Nf3', 'e6', 'd4'], playerColor: 'white' },
      [NAJDORF_LINE, SVESHNIKOV_LINE]
    );
    expect(result?.status).toBe('gap');
    expect(result?.divergence?.played).toBe('e6');
    expect(result?.divergence?.expected).toEqual(expect.arrayContaining(['d6', 'Nc6']));
    expect(result?.divergence?.expected).toHaveLength(2);
  });

  it("reports the player's own off-book move as a deviation", () => {
    const result = matchGameToRepertoire({ moves: ['e4', 'c5', 'Nc3'], playerColor: 'white' }, [
      NAJDORF_LINE,
    ]);
    expect(result?.status).toBe('deviation');
    expect(result?.divergence?.ply).toBe(2);
    expect(result?.divergence?.played).toBe('Nc3');
    expect(result?.divergence?.expected).toEqual(['Nf3']);
  });

  it('returns null when no stored line applies to the game', () => {
    // A [FEN]-rooted line whose position this game never reaches.
    const fenLine =
      '[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1"]\n\n1... d5 2. c4';
    // The game starts 1. e4, so the FEN root (black to move at the start) is
    // never on the board.
    const result = matchGameToRepertoire({ moves: ['e4', 'e5'], playerColor: 'black' }, [fenLine]);
    expect(result).toBeNull();
  });

  it('skips unparseable lines instead of failing the whole check', () => {
    const result = matchGameToRepertoire(
      { moves: ['e4', 'c5', 'Nf3', 'd6'], playerColor: 'white' },
      ['1. e4 e5 2. Zz9 broken', NAJDORF_LINE]
    );
    expect(result?.status).toBe('in-book');
  });

  it("does not surface a kata the game's own first move already leaves", () => {
    // White played 1. d4, not the 1. e4 this kata prepares — a deviation at
    // ply 0, followedPlies 0.
    const result = matchGameToRepertoire({ moves: ['d4', 'd5'], playerColor: 'white' }, [
      NAJDORF_LINE,
    ]);
    expect(result?.status).toBe('deviation');
    expect(result?.followedPlies).toBe(0);
    expect(isRepertoireApplicableFromFirstMove(result!)).toBe(false);
  });

  it("does not surface a black kata the opponent's own first move already leaves", () => {
    // Prepared as a reply to 1. e4; the opponent opened 1. d4 instead — a gap
    // at ply 0, followedPlies 0.
    const result = matchGameToRepertoire({ moves: ['d4', 'd5'], playerColor: 'black' }, [
      NAJDORF_LINE,
    ]);
    expect(result?.status).toBe('gap');
    expect(result?.followedPlies).toBe(0);
    expect(isRepertoireApplicableFromFirstMove(result!)).toBe(false);
  });
});

describe('isRepertoireApplicableFromFirstMove', () => {
  it('keeps an in-book result even with zero followed plies (degenerate empty kata)', () => {
    expect(
      isRepertoireApplicableFromFirstMove({ status: 'in-book', enteredAtPly: 0, followedPlies: 0 })
    ).toBe(true);
  });

  it('keeps a deviation/gap once at least one move matched', () => {
    expect(
      isRepertoireApplicableFromFirstMove({
        status: 'deviation',
        enteredAtPly: 0,
        followedPlies: 4,
      })
    ).toBe(true);
    expect(
      isRepertoireApplicableFromFirstMove({ status: 'gap', enteredAtPly: 0, followedPlies: 1 })
    ).toBe(true);
  });

  it('drops a not-applicable result', () => {
    expect(
      isRepertoireApplicableFromFirstMove({
        status: 'not-applicable',
        enteredAtPly: null,
        followedPlies: 0,
      })
    ).toBe(false);
  });
});

describe('mergeLineTrees', () => {
  it('merges shared-root trees without mutating the inputs', () => {
    const a = parsePgnTree(NAJDORF_LINE);
    const b = parsePgnTree(SVESHNIKOV_LINE);
    const aSnapshot = JSON.parse(JSON.stringify(a));
    const bSnapshot = JSON.parse(JSON.stringify(b));

    const merged = mergeLineTrees([a, b]);

    // One root, and the shared 1. e4 c5 2. Nf3 prefix collapses into a single
    // path that branches at Black's third move.
    expect(merged).toHaveLength(1);
    let node = merged[0].children;
    for (const san of ['e4', 'c5', 'Nf3']) {
      expect(node).toHaveLength(1);
      expect(node[0].san).toBe(san);
      node = node[0].children;
    }
    expect(node.map((n) => n.san).sort()).toEqual(['Nc6', 'd6']);

    // The merge is pure: a previous implementation grafted nodes into the
    // inputs' children arrays, corrupting reused parsePgnTree results.
    expect(a).toEqual(aSnapshot);
    expect(b).toEqual(bSnapshot);
  });
});
