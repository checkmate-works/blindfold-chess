import { getStartingFen } from '@blindfold-chess/features/chess-core';
import { describe, expect, it } from 'vitest';

import { pgnRowToCard } from './attachment-card-mappers';

const baseRow = {
  id: 'a1',
  source: 'pgn',
  sourceUrl: null,
  sourceGameId: null,
  moveCount: 2,
  headerWhite: null,
  headerBlack: null,
  headerResult: null,
  headerEvent: null,
  headerSite: null,
  headerDate: null,
  anonymized: false,
  attributionPlatform: null,
  attributionPath: null,
};

describe('pgnRowToCard', () => {
  it('derives the final-position FEN by replaying the PGN', () => {
    const card = pgnRowToCard({ ...baseRow, pgn: '1. e4 e5' });
    expect(card.finalFen).toContain('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(card.pgn).toBe('1. e4 e5');
  });

  it('falls back to the standard start for an unparseable PGN', () => {
    const card = pgnRowToCard({ ...baseRow, pgn: '1. Zz9 ???' });
    expect(card.finalFen).toBe(getStartingFen());
  });
});
