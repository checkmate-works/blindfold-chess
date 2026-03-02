import { describe, expect, it } from 'vitest';

import { getEnPassantAvailability } from './get-en-passant-availability';

const allDisabled = {
  a: false,
  b: false,
  c: false,
  d: false,
  e: false,
  f: false,
  g: false,
  h: false,
};

describe('getEnPassantAvailability', () => {
  it('returns all false for the starting position (white to move)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    expect(getEnPassantAvailability(fen, 'w')).toEqual(allDisabled);
  });

  it('returns all false for the starting position (black to move)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    expect(getEnPassantAvailability(fen, 'b')).toEqual(allDisabled);
  });

  it('enables en passant when a black pawn is on rank 5 for white to move', () => {
    // Black pawn on e5
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR';
    expect(getEnPassantAvailability(fen, 'w')).toEqual({
      ...allDisabled,
      e: true,
    });
  });

  it('enables en passant when a white pawn is on rank 4 for black to move', () => {
    // White pawn on d4
    const fen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR';
    expect(getEnPassantAvailability(fen, 'b')).toEqual({
      ...allDisabled,
      d: true,
    });
  });

  it('enables multiple files when multiple pawns are on the correct rank', () => {
    // Black pawns on a5 and h5
    const fen = 'rnbqkbnr/1pppppp1/8/p6p/8/8/PPPPPPPP/RNBQKBNR';
    expect(getEnPassantAvailability(fen, 'w')).toEqual({
      ...allDisabled,
      a: true,
      h: true,
    });
  });

  it('returns all false for an empty board', () => {
    const fen = '8/8/8/8/8/8/8/8';
    expect(getEnPassantAvailability(fen, 'w')).toEqual(allDisabled);
    expect(getEnPassantAvailability(fen, 'b')).toEqual(allDisabled);
  });

  it('does not enable en passant for wrong color pawn on correct rank (white pawn on rank 5)', () => {
    // White pawn on e5 (wrong color for white's turn)
    const fen = 'rnbqkbnr/pppppppp/8/4P3/8/8/PPPP1PPP/RNBQKBNR';
    expect(getEnPassantAvailability(fen, 'w')).toEqual(allDisabled);
  });

  it('does not enable en passant for wrong color pawn on correct rank (black pawn on rank 4)', () => {
    // Black pawn on d4 (wrong color for black's turn)
    const fen = 'rnbqkbnr/ppp1pppp/8/8/3p4/8/PPPPPPPP/RNBQKBNR';
    expect(getEnPassantAvailability(fen, 'b')).toEqual(allDisabled);
  });

  it('handles FEN with full notation (ignores parts after board)', () => {
    // Black pawn on e5, full FEN notation
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
    expect(getEnPassantAvailability(fen, 'w')).toEqual({
      ...allDisabled,
      e: true,
    });
  });

  it('correctly identifies pawn on file a (first file)', () => {
    // Black pawn on a5
    const fen = '8/8/8/p7/8/8/8/8';
    expect(getEnPassantAvailability(fen, 'w')).toEqual({
      ...allDisabled,
      a: true,
    });
  });

  it('correctly identifies pawn on file h (last file)', () => {
    // White pawn on h4
    const fen = '8/8/8/8/7P/8/8/8';
    expect(getEnPassantAvailability(fen, 'b')).toEqual({
      ...allDisabled,
      h: true,
    });
  });
});
