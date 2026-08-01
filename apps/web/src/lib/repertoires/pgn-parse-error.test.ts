import { describe, expect, it } from 'vitest';

import { findPgnFormError } from './pgn-parse-error';

describe('findPgnFormError', () => {
  it('accepts a legal PGN with variations', () => {
    expect(findPgnFormError('1. e4 c5 2. Nf3 d6 (2... Nc6 3. d4) 3. d4')).toBeNull();
  });

  it('treats blank input as "not filled in yet", not an error', () => {
    expect(findPgnFormError('')).toBeNull();
    expect(findPgnFormError('   \n ')).toBeNull();
  });

  it('locates the move that cannot be played', () => {
    // The Lichess analysis board reports this exact PGN as
    // "Can't play d7 at move 8, ply 16".
    const pgn =
      '1. Nf3 d5 2. g3 d4 3. c3 dxc3 4. bxc3 Nc6 5. Bg2 e6 6. d4 b6 7. Ne5 Nxe5 8. Bxa8 d7 9. Bg2 Ng6';
    expect(findPgnFormError(pgn)).toEqual({
      kind: 'illegalMove',
      san: 'd7',
      moveNumber: 8,
      ply: 16,
    });
  });

  it('locates an illegal move inside a variation', () => {
    expect(findPgnFormError('1. e4 e5 (1... Ke7) 2. Nf3')).toEqual({
      kind: 'illegalMove',
      san: 'Ke7',
      moveNumber: 1,
      ply: 2,
    });
  });

  it('reports notation that holds no moves at all as unreadable', () => {
    expect(findPgnFormError('[Event "x"]\n\n*')).toEqual({ kind: 'unreadable' });
  });

  it('reports a broken [FEN] header as unreadable', () => {
    expect(findPgnFormError('[FEN "not a fen"]\n[SetUp "1"]\n\n1. e4')).toEqual({
      kind: 'unreadable',
    });
  });
});
