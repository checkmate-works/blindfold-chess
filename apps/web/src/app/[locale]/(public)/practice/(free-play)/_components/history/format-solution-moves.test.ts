import { describe, expect, it } from 'vitest';

import { formatSolutionMovesForDisplay } from './format-solution-moves';

describe('formatSolutionMovesForDisplay', () => {
  it('joins moves in a single row with commas', () => {
    expect(
      formatSolutionMovesForDisplay([
        [
          { san: 'Qh7+', note: null },
          { san: 'Kf8', note: null },
          { san: 'Qh8#', note: null },
        ],
      ])
    ).toBe('Qh7+, Kf8, Qh8#');
  });

  it('appends a parenthesized note when present', () => {
    expect(formatSolutionMovesForDisplay([[{ san: 'Nf3', note: 'develops and eyes e5' }]])).toBe(
      'Nf3 (develops and eyes e5)'
    );
  });

  it('joins alternative-solution rows with a pipe', () => {
    expect(
      formatSolutionMovesForDisplay([[{ san: 'Nf3', note: null }], [{ san: 'Bg5', note: null }]])
    ).toBe('Nf3 | Bg5');
  });

  it('returns an empty string for no rows', () => {
    expect(formatSolutionMovesForDisplay([])).toBe('');
  });
});
