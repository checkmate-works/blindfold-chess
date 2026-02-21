import { describe, expect, it } from 'vitest';

import { getCastlingAvailability } from './get-castling-availability';

describe('getCastlingAvailability', () => {
  it('returns all true for the starting position', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    expect(getCastlingAvailability(fen)).toEqual({
      K: true,
      Q: true,
      k: true,
      q: true,
    });
  });

  it('returns all false for an empty board', () => {
    const fen = '8/8/8/8/8/8/8/8';
    expect(getCastlingAvailability(fen)).toEqual({
      K: false,
      Q: false,
      k: false,
      q: false,
    });
  });

  it('returns false when white king is not on e1', () => {
    // White king on d1 instead of e1
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBK1BNR';
    expect(getCastlingAvailability(fen)).toEqual({
      K: false,
      Q: false,
      k: true,
      q: true,
    });
  });

  it('returns false for white kingside when h1 rook is missing', () => {
    // No rook on h1
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN1';
    expect(getCastlingAvailability(fen)).toEqual({
      K: false,
      Q: true,
      k: true,
      q: true,
    });
  });

  it('returns false for white queenside when a1 rook is missing', () => {
    // No rook on a1
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR';
    expect(getCastlingAvailability(fen)).toEqual({
      K: true,
      Q: false,
      k: true,
      q: true,
    });
  });

  it('returns false when black king is not on e8', () => {
    // Black king on d8
    const fen = 'rnbk1bnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    expect(getCastlingAvailability(fen)).toEqual({
      K: true,
      Q: true,
      k: false,
      q: false,
    });
  });

  it('returns false for black kingside when h8 rook is missing', () => {
    const fen = 'rnbqkbn1/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    expect(getCastlingAvailability(fen)).toEqual({
      K: true,
      Q: true,
      k: false,
      q: true,
    });
  });

  it('returns false for black queenside when a8 rook is missing', () => {
    const fen = '1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    expect(getCastlingAvailability(fen)).toEqual({
      K: true,
      Q: true,
      k: true,
      q: false,
    });
  });

  it('handles FEN with full notation (ignores parts after board)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(getCastlingAvailability(fen)).toEqual({
      K: true,
      Q: true,
      k: true,
      q: true,
    });
  });

  it('returns all false when only kings remain on initial squares', () => {
    const fen = '4k3/8/8/8/8/8/8/4K3';
    expect(getCastlingAvailability(fen)).toEqual({
      K: false,
      Q: false,
      k: false,
      q: false,
    });
  });
});
