import { describe, expect, it } from 'vitest';

import { META_DESCRIPTION_MAX, toMetaDescription } from './meta-description';

describe('toMetaDescription', () => {
  describe('whitespace normalization', () => {
    it('collapses newlines into single spaces', () => {
      expect(toMetaDescription('first line\nsecond line')).toBe('first line second line');
    });

    it('collapses blank lines, tabs and runs of spaces into a single space', () => {
      expect(toMetaDescription('a\n\n\nb\t\tc    d')).toBe('a b c d');
    });

    it('collapses non-breaking and ideographic spaces too', () => {
      expect(toMetaDescription('a b　c')).toBe('a b c');
    });

    it('trims leading and trailing whitespace', () => {
      expect(toMetaDescription('  \n padded \n  ')).toBe('padded');
    });
  });

  describe('truncation', () => {
    it('leaves text shorter than the limit untouched', () => {
      expect(toMetaDescription('short')).toBe('short');
    });

    it('appends no ellipsis at exactly the limit', () => {
      const exact = 'a'.repeat(META_DESCRIPTION_MAX);

      const result = toMetaDescription(exact);

      expect(result).toBe(exact);
      expect(result).not.toContain('…');
      expect(result).toHaveLength(META_DESCRIPTION_MAX);
    });

    it('cuts one character past the limit to 159 characters plus an ellipsis', () => {
      const result = toMetaDescription('a'.repeat(META_DESCRIPTION_MAX + 1));

      expect(result).toBe(`${'a'.repeat(META_DESCRIPTION_MAX - 1)}…`);
      expect(result).toHaveLength(META_DESCRIPTION_MAX);
    });

    it('counts the ellipsis inside the budget for long text', () => {
      const result = toMetaDescription('a'.repeat(1000));

      expect(result).toHaveLength(META_DESCRIPTION_MAX);
      expect(result.endsWith('…')).toBe(true);
    });

    it('uses a single-character ellipsis, not three periods', () => {
      const result = toMetaDescription('a'.repeat(1000));

      expect(result.endsWith('...')).toBe(false);
      expect(result.slice(-1)).toBe('…');
    });

    it('measures the limit after collapsing whitespace, not before', () => {
      // 30 words separated by blank lines: 207 characters raw (over the
      // limit), 149 once the separators collapse (under it), so nothing is cut.
      const words = Array.from({ length: 30 }, () => 'word');
      const paragraphs = words.join('\n\n\n');

      expect(paragraphs.length).toBeGreaterThan(META_DESCRIPTION_MAX);
      expect(toMetaDescription(paragraphs)).toBe(words.join(' '));
    });

    it('honours a caller-supplied limit', () => {
      expect(toMetaDescription('abcdefghij', 5)).toBe('abcd…');
    });

    it('drops the trailing space instead of emitting " …"', () => {
      expect(toMetaDescription('ab cdefg', 4)).toBe('ab…');
    });
  });

  describe('idempotence', () => {
    it('returns its own truncated output unchanged', () => {
      const once = toMetaDescription('a'.repeat(1000));
      const twice = toMetaDescription(once);

      expect(twice).toBe(once);
      expect(twice.endsWith('……')).toBe(false);
    });

    it('returns its own normalized output unchanged', () => {
      const once = toMetaDescription('a\n\nb   c');

      expect(toMetaDescription(once)).toBe(once);
    });
  });

  describe('empty input', () => {
    it('returns an empty string for an empty string', () => {
      expect(toMetaDescription('')).toBe('');
    });

    it('returns an empty string for whitespace-only text', () => {
      expect(toMetaDescription('   \n\t  ')).toBe('');
    });

    it('returns an empty string for null', () => {
      expect(toMetaDescription(null)).toBe('');
    });

    it('returns an empty string for undefined', () => {
      expect(toMetaDescription(undefined)).toBe('');
    });

    it('is falsy for empty input so callers can spell "omit the key"', () => {
      expect(toMetaDescription(null) || undefined).toBeUndefined();
    });
  });

  describe('astral characters', () => {
    it('never leaves a lone surrogate when the cut lands inside a pair', () => {
      // '🙂' is one astral character = two UTF-16 code units, so a limit of 4
      // puts the cut between its halves.
      const result = toMetaDescription('ab🙂cd', 4);

      expect(result).toBe('ab…');
      expect(/[\ud800-\udbff]/.test(result)).toBe(false);
    });

    it('keeps a pair that fits entirely within the budget', () => {
      expect(toMetaDescription('a🙂bcd', 5)).toBe('a🙂b…');
    });
  });
});
