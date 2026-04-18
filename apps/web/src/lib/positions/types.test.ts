import { describe, expect, it } from 'vitest';

import { parsePositionType } from './types';

describe('parsePositionType', () => {
  describe('known values', () => {
    it('returns "memory" for the literal string "memory"', () => {
      expect(parsePositionType('memory')).toBe('memory');
    });

    it('returns "puzzle" for the literal string "puzzle"', () => {
      expect(parsePositionType('puzzle')).toBe('puzzle');
    });

    it('returns "sequence" for the literal string "sequence"', () => {
      expect(parsePositionType('sequence')).toBe('sequence');
    });
  });

  describe('unknown values', () => {
    it('returns null for an empty string', () => {
      // Defensive guard: if `positions.type` ever becomes empty for any row
      // (schema bug, bad migration, etc.) we should silently drop it rather
      // than crash the feed.
      expect(parsePositionType('')).toBeNull();
    });

    it('returns null for an uppercase variant ("MEMORY") — matching is case-sensitive', () => {
      // The DB column is expected to always be lowercase. An uppercase
      // spelling would indicate a bug upstream; we treat it as unknown.
      expect(parsePositionType('MEMORY')).toBeNull();
    });

    it('returns null for a typo / mixed-case variant ("Puzzle")', () => {
      expect(parsePositionType('Puzzle')).toBeNull();
    });

    it('returns null for an unrelated arbitrary string', () => {
      expect(parsePositionType('unknown_type')).toBeNull();
    });

    it('returns null for a string containing a known value as substring ("memoryy")', () => {
      // Guards against naive `includes`-style checks that could match
      // superstrings by mistake.
      expect(parsePositionType('memoryy')).toBeNull();
    });

    it('returns null for whitespace around a known value (" memory ")', () => {
      // Raw DB values are not trimmed by this function; callers must supply
      // the canonical string.
      expect(parsePositionType(' memory ')).toBeNull();
    });
  });
});
