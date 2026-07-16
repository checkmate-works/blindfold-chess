import { describe, expect, it } from 'vitest';

import { isKataApplicableFromFirstMove, matchGameToKata } from './kata-match';

// Two stored lines sharing the 1. e4 c5 2. Nf3 prefix, as the import
// decomposition would produce them from one PGN with a variation.
const NAJDORF_LINE = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6';
const SVESHNIKOV_LINE = '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e5';

describe('matchGameToKata', () => {
  it('reports in-book when the game follows a stored line to its end', () => {
    const result = matchGameToKata(
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
    const result = matchGameToKata(
      { moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4'], playerColor: 'white' },
      [NAJDORF_LINE, SVESHNIKOV_LINE]
    );
    expect(result?.status).toBe('in-book');
    expect(result?.followedPlies).toBe(6);
  });

  it('merges branch alternatives into the expected list on a gap', () => {
    // White is on book; black (the opponent here) plays 2... e6, which neither
    // line prepares. Both prepared replies must be surfaced.
    const result = matchGameToKata(
      { moves: ['e4', 'c5', 'Nf3', 'e6', 'd4'], playerColor: 'white' },
      [NAJDORF_LINE, SVESHNIKOV_LINE]
    );
    expect(result?.status).toBe('gap');
    expect(result?.divergence?.played).toBe('e6');
    expect(result?.divergence?.expected).toEqual(expect.arrayContaining(['d6', 'Nc6']));
    expect(result?.divergence?.expected).toHaveLength(2);
  });

  it("reports the player's own off-book move as a deviation", () => {
    const result = matchGameToKata({ moves: ['e4', 'c5', 'Nc3'], playerColor: 'white' }, [
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
    const result = matchGameToKata({ moves: ['e4', 'e5'], playerColor: 'black' }, [fenLine]);
    expect(result).toBeNull();
  });

  it('skips unparseable lines instead of failing the whole check', () => {
    const result = matchGameToKata({ moves: ['e4', 'c5', 'Nf3', 'd6'], playerColor: 'white' }, [
      '1. e4 e5 2. Zz9 broken',
      NAJDORF_LINE,
    ]);
    expect(result?.status).toBe('in-book');
  });

  it("does not surface a kata the game's own first move already leaves", () => {
    // White played 1. d4, not the 1. e4 this kata prepares — a deviation at
    // ply 0, followedPlies 0.
    const result = matchGameToKata({ moves: ['d4', 'd5'], playerColor: 'white' }, [NAJDORF_LINE]);
    expect(result?.status).toBe('deviation');
    expect(result?.followedPlies).toBe(0);
    expect(isKataApplicableFromFirstMove(result!)).toBe(false);
  });

  it("does not surface a black kata the opponent's own first move already leaves", () => {
    // Prepared as a reply to 1. e4; the opponent opened 1. d4 instead — a gap
    // at ply 0, followedPlies 0.
    const result = matchGameToKata({ moves: ['d4', 'd5'], playerColor: 'black' }, [NAJDORF_LINE]);
    expect(result?.status).toBe('gap');
    expect(result?.followedPlies).toBe(0);
    expect(isKataApplicableFromFirstMove(result!)).toBe(false);
  });
});

describe('isKataApplicableFromFirstMove', () => {
  it('keeps an in-book result even with zero followed plies (degenerate empty kata)', () => {
    expect(
      isKataApplicableFromFirstMove({ status: 'in-book', enteredAtPly: 0, followedPlies: 0 })
    ).toBe(true);
  });

  it('keeps a deviation/gap once at least one move matched', () => {
    expect(
      isKataApplicableFromFirstMove({ status: 'deviation', enteredAtPly: 0, followedPlies: 4 })
    ).toBe(true);
    expect(
      isKataApplicableFromFirstMove({ status: 'gap', enteredAtPly: 0, followedPlies: 1 })
    ).toBe(true);
  });

  it('drops a not-applicable result', () => {
    expect(
      isKataApplicableFromFirstMove({
        status: 'not-applicable',
        enteredAtPly: null,
        followedPlies: 0,
      })
    ).toBe(false);
  });
});
