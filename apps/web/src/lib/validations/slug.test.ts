import { describe, expect, it } from 'vitest';

import { deriveSlugFromTitle } from './slug';

describe('deriveSlugFromTitle', () => {
  it('lowercases and hyphenates a plain title', () => {
    expect(deriveSlugFromTitle('Rook Battery')).toBe('rook-battery');
  });

  it('collapses runs of whitespace and hyphens into a single hyphen', () => {
    expect(deriveSlugFromTitle('Getting   started -- with chess')).toBe(
      'getting-started-with-chess'
    );
  });

  it('drops characters outside [a-z0-9-] and trims stray delimiters', () => {
    expect(deriveSlugFromTitle('  "King\'s Indian" (E60)!  ')).toBe('kings-indian-e60');
  });

  it('returns an empty string when nothing derivable remains', () => {
    // Guards the caller contract: a Japanese article title yields no slug, so
    // `GenerateSlugButton` must stay disabled rather than wipe the input.
    expect(deriveSlugFromTitle('新機能のお知らせ')).toBe('');
    expect(deriveSlugFromTitle('!!!')).toBe('');
    expect(deriveSlugFromTitle('')).toBe('');
  });
});
