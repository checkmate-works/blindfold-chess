import { describe, expect, it } from 'vitest';

import { OPENING_CATEGORIES, classifyEcoCode } from './categories';

describe('OPENING_CATEGORIES', () => {
  it('should contain exactly 6 categories', () => {
    expect(OPENING_CATEGORIES).toHaveLength(6);
  });

  it('should contain expected category values', () => {
    expect(OPENING_CATEGORIES).toEqual(['open', 'semi-open', 'closed', 'indian', 'flank', 'other']);
  });
});

describe('classifyEcoCode', () => {
  describe('open (C20-C99)', () => {
    it('should classify C20 as open (lower boundary)', () => {
      expect(classifyEcoCode('C20')).toBe('open');
    });

    it('should classify C99 as open (upper boundary)', () => {
      expect(classifyEcoCode('C99')).toBe('open');
    });

    it('should classify representative open codes', () => {
      expect(classifyEcoCode('C50')).toBe('open');
      expect(classifyEcoCode('C60')).toBe('open');
      expect(classifyEcoCode('C42')).toBe('open');
    });
  });

  describe('semi-open (B00-B99, C00-C19)', () => {
    it('should classify B00 as semi-open (B-range lower boundary)', () => {
      expect(classifyEcoCode('B00')).toBe('semi-open');
    });

    it('should classify B99 as semi-open (B-range upper boundary)', () => {
      expect(classifyEcoCode('B99')).toBe('semi-open');
    });

    it('should classify C00 as semi-open (C-range lower boundary)', () => {
      expect(classifyEcoCode('C00')).toBe('semi-open');
    });

    it('should classify C19 as semi-open (C-range upper boundary)', () => {
      expect(classifyEcoCode('C19')).toBe('semi-open');
    });

    it('should classify representative semi-open codes', () => {
      expect(classifyEcoCode('B20')).toBe('semi-open');
      expect(classifyEcoCode('B50')).toBe('semi-open');
      expect(classifyEcoCode('B01')).toBe('semi-open');
      expect(classifyEcoCode('C10')).toBe('semi-open');
    });
  });

  describe('closed (D00-D69)', () => {
    it('should classify D00 as closed (lower boundary)', () => {
      expect(classifyEcoCode('D00')).toBe('closed');
    });

    it('should classify D69 as closed (upper boundary)', () => {
      expect(classifyEcoCode('D69')).toBe('closed');
    });

    it('should classify representative closed codes', () => {
      expect(classifyEcoCode('D30')).toBe('closed');
      expect(classifyEcoCode('D50')).toBe('closed');
    });
  });

  describe('indian (A45-A79, D70-D99, E00-E99)', () => {
    it('should classify A45 as indian (A-range lower boundary)', () => {
      expect(classifyEcoCode('A45')).toBe('indian');
    });

    it('should classify A79 as indian (A-range upper boundary)', () => {
      expect(classifyEcoCode('A79')).toBe('indian');
    });

    it('should classify D70 as indian (D-range lower boundary)', () => {
      expect(classifyEcoCode('D70')).toBe('indian');
    });

    it('should classify D99 as indian (D-range upper boundary)', () => {
      expect(classifyEcoCode('D99')).toBe('indian');
    });

    it('should classify E00 as indian (E-range lower boundary)', () => {
      expect(classifyEcoCode('E00')).toBe('indian');
    });

    it('should classify E99 as indian (E-range upper boundary)', () => {
      expect(classifyEcoCode('E99')).toBe('indian');
    });

    it('should classify representative indian codes', () => {
      expect(classifyEcoCode('A60')).toBe('indian');
      expect(classifyEcoCode('D85')).toBe('indian');
      expect(classifyEcoCode('E20')).toBe('indian');
      expect(classifyEcoCode('E62')).toBe('indian');
    });
  });

  describe('flank (A00-A39)', () => {
    it('should classify A00 as flank (lower boundary)', () => {
      expect(classifyEcoCode('A00')).toBe('flank');
    });

    it('should classify A39 as flank (upper boundary)', () => {
      expect(classifyEcoCode('A39')).toBe('flank');
    });

    it('should classify representative flank codes', () => {
      expect(classifyEcoCode('A04')).toBe('flank');
      expect(classifyEcoCode('A10')).toBe('flank');
      expect(classifyEcoCode('A20')).toBe('flank');
    });
  });

  describe('other (A40-A44, A80-A99, everything else)', () => {
    it('should classify A40-A44 as other', () => {
      expect(classifyEcoCode('A40')).toBe('other');
      expect(classifyEcoCode('A44')).toBe('other');
      expect(classifyEcoCode('A42')).toBe('other');
    });

    it('should classify A80-A99 as other (Dutch Defense)', () => {
      expect(classifyEcoCode('A80')).toBe('other');
      expect(classifyEcoCode('A99')).toBe('other');
      expect(classifyEcoCode('A90')).toBe('other');
    });
  });

  describe('boundary values between categories', () => {
    it('should distinguish A39 (flank) from A40 (other)', () => {
      expect(classifyEcoCode('A39')).toBe('flank');
      expect(classifyEcoCode('A40')).toBe('other');
    });

    it('should distinguish A44 (other) from A45 (indian)', () => {
      expect(classifyEcoCode('A44')).toBe('other');
      expect(classifyEcoCode('A45')).toBe('indian');
    });

    it('should distinguish A79 (indian) from A80 (other)', () => {
      expect(classifyEcoCode('A79')).toBe('indian');
      expect(classifyEcoCode('A80')).toBe('other');
    });

    it('should distinguish C19 (semi-open) from C20 (open)', () => {
      expect(classifyEcoCode('C19')).toBe('semi-open');
      expect(classifyEcoCode('C20')).toBe('open');
    });

    it('should distinguish D69 (closed) from D70 (indian)', () => {
      expect(classifyEcoCode('D69')).toBe('closed');
      expect(classifyEcoCode('D70')).toBe('indian');
    });
  });

  describe('invalid inputs', () => {
    it('should return other for empty string', () => {
      expect(classifyEcoCode('')).toBe('other');
    });

    it('should return other for single character', () => {
      expect(classifyEcoCode('A')).toBe('other');
    });

    it('should return other for lowercase eco codes', () => {
      expect(classifyEcoCode('b20')).toBe('other');
      expect(classifyEcoCode('c50')).toBe('other');
      expect(classifyEcoCode('e10')).toBe('other');
    });

    it('should return other for non-ECO letter prefixes', () => {
      expect(classifyEcoCode('F00')).toBe('other');
      expect(classifyEcoCode('Z50')).toBe('other');
      expect(classifyEcoCode('X99')).toBe('other');
    });

    it('should return other for non-numeric suffix', () => {
      expect(classifyEcoCode('Bxx')).toBe('other');
      expect(classifyEcoCode('Cab')).toBe('other');
    });

    it('should return other for numeric-only input', () => {
      expect(classifyEcoCode('00')).toBe('other');
      expect(classifyEcoCode('99')).toBe('other');
    });
  });

  describe('edge cases', () => {
    it('should handle ECO codes with leading zeros (single digit)', () => {
      expect(classifyEcoCode('B0')).toBe('semi-open');
      expect(classifyEcoCode('A0')).toBe('flank');
    });

    it('should handle numbers beyond valid ECO range', () => {
      expect(classifyEcoCode('B100')).toBe('other');
      expect(classifyEcoCode('C100')).toBe('other');
      expect(classifyEcoCode('A100')).toBe('other');
    });

    it('should handle negative number parsing (e.g. hyphen in code)', () => {
      expect(classifyEcoCode('B-1')).toBe('other');
    });

    it('should parse extra digits as a number (B000000 -> num=0)', () => {
      expect(classifyEcoCode('B000000')).toBe('semi-open');
    });

    it('should return other for codes with large numeric values', () => {
      expect(classifyEcoCode('B999')).toBe('other');
      expect(classifyEcoCode('C200')).toBe('other');
    });
  });
});
