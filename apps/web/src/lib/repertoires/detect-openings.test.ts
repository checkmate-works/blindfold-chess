import { describe, expect, it } from 'vitest';

import { detectOpeningIdsFromPgn } from './detect-openings';

const OPENINGS = [
  { id: 'italian', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3' },
  { id: 'ruy-lopez', fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3' },
  { id: 'sicilian', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2' },
];

describe('detectOpeningIdsFromPgn', () => {
  it('names one opening per variation, in master order', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bc4 (3. Bb5 a6) 3... Bc5';
    expect(detectOpeningIdsFromPgn(pgn, OPENINGS)).toEqual(['italian', 'ruy-lopez']);
  });

  it('matches the main line of a PGN without variations', () => {
    expect(detectOpeningIdsFromPgn('1. e4 c5 2. Nf3 d6', OPENINGS)).toEqual(['sicilian']);
  });

  it('yields nothing for a blank, half-typed, or unmatched PGN', () => {
    expect(detectOpeningIdsFromPgn('   ', OPENINGS)).toEqual([]);
    expect(detectOpeningIdsFromPgn('1. e4 zz', OPENINGS)).toEqual([]);
    expect(detectOpeningIdsFromPgn('1. d4 d5', OPENINGS)).toEqual([]);
  });
});
