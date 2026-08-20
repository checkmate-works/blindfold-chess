import { describe, expect, it } from 'vitest';

import { buildDefaultPracticeTitle } from './default-title';

// A fixed local-noon instant: the date segment is formatted in local time, so
// midday keeps the expected date in every timezone the suite might run in.
const NOON = new Date(2026, 4, 18, 12, 0, 0);

describe('buildDefaultPracticeTitle', () => {
  it('joins prefix, date and display name', () => {
    expect(buildDefaultPracticeTitle('Puzzle', 'alice', NOON)).toBe('Puzzle 2026-05-18 - alice');
  });

  it('omits the name segment when the display name is blank', () => {
    expect(buildDefaultPracticeTitle('Position', '   ', NOON)).toBe('Position 2026-05-18');
  });

  it('trims surrounding whitespace from the display name', () => {
    expect(buildDefaultPracticeTitle('Puzzle', '  bob  ', NOON)).toBe('Puzzle 2026-05-18 - bob');
  });

  it('returns an empty string when no display name was supplied at all', () => {
    expect(buildDefaultPracticeTitle('Puzzle', undefined, NOON)).toBe('');
  });

  it('zero-pads single-digit months and days', () => {
    expect(buildDefaultPracticeTitle('Puzzle', 'alice', new Date(2026, 0, 5, 12))).toBe(
      'Puzzle 2026-01-05 - alice'
    );
  });
});
