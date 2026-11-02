import { describe, expect, it } from 'vitest';

import { parseFenFields } from './parse-fen-fields';

const START_PLACEMENT = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

describe('parseFenFields', () => {
  it('reads placement, side to move, castling and en passant from a well-formed FEN', () => {
    expect(parseFenFields(`${START_PLACEMENT} b KQkq e3 0 1`)).toEqual({
      placement: START_PLACEMENT,
      sideToMove: 'b',
      castling: 'KQkq',
      enPassant: 'e3',
    });
  });

  it('passes "-" castling and en-passant fields through unchanged', () => {
    expect(parseFenFields(`${START_PLACEMENT} w - - 0 1`)).toEqual({
      placement: START_PLACEMENT,
      sideToMove: 'w',
      castling: '-',
      enPassant: '-',
    });
  });

  it('ignores leading and trailing whitespace pasted around the FEN', () => {
    expect(parseFenFields(`  \t${START_PLACEMENT} w KQkq - 0 1 \n`)).toEqual({
      placement: START_PLACEMENT,
      sideToMove: 'w',
      castling: 'KQkq',
      enPassant: '-',
    });
  });

  it('does not shift later fields when fields are separated by repeated whitespace', () => {
    expect(parseFenFields(`${START_PLACEMENT}  b \t Kq   d6  0 1`)).toEqual({
      placement: START_PLACEMENT,
      sideToMove: 'b',
      castling: 'Kq',
      enPassant: 'd6',
    });
  });

  it('returns only the placement, with no side to move, for a placement-only FEN', () => {
    const fields = parseFenFields(START_PLACEMENT);
    expect(fields).toEqual({ placement: START_PLACEMENT, sideToMove: null });
    expect(fields).not.toHaveProperty('castling');
    expect(fields).not.toHaveProperty('enPassant');
  });

  it('reports no side to move when the side field is neither "w" nor "b"', () => {
    expect(parseFenFields(`${START_PLACEMENT} x KQkq - 0 1`)).toEqual({
      placement: START_PLACEMENT,
      sideToMove: null,
      castling: 'KQkq',
      enPassant: '-',
    });
    expect(parseFenFields(`${START_PLACEMENT} W KQkq - 0 1`)?.sideToMove).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseFenFields('')).toBeNull();
  });

  it('returns null for a whitespace-only string', () => {
    expect(parseFenFields('  \t\n ')).toBeNull();
  });
});
