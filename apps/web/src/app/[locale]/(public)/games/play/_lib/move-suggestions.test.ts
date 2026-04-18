import { describe, expect, it } from 'vitest';

import { buildCompletePattern, generateMoveSuggestions } from './move-suggestions';

describe('generateMoveSuggestions', () => {
  describe('empty and invalid input', () => {
    it('should return empty array for empty string', () => {
      expect(generateMoveSuggestions('')).toEqual([]);
    });

    it('should return empty array for whitespace only', () => {
      expect(generateMoveSuggestions('   ')).toEqual([]);
    });

    it('should return empty array for invalid input', () => {
      expect(generateMoveSuggestions('xyz')).toEqual([]);
      expect(generateMoveSuggestions('123')).toEqual([]);
    });
  });

  describe('complete moves', () => {
    it('should return empty array for complete castling moves', () => {
      expect(generateMoveSuggestions('O-O')).toEqual([]);
      expect(generateMoveSuggestions('O-O-O')).toEqual([]);
    });

    it('should return empty array for complete pawn moves', () => {
      expect(generateMoveSuggestions('e4')).toEqual([]);
      expect(generateMoveSuggestions('d5')).toEqual([]);
      expect(generateMoveSuggestions('e4+')).toEqual([]);
      expect(generateMoveSuggestions('d5#')).toEqual([]);
    });

    it('should return empty array for complete pawn captures', () => {
      expect(generateMoveSuggestions('exd5')).toEqual([]);
      expect(generateMoveSuggestions('dxc4+')).toEqual([]);
    });

    it('should return empty array for complete pawn promotions', () => {
      expect(generateMoveSuggestions('e8=Q')).toEqual([]);
      expect(generateMoveSuggestions('a1=N')).toEqual([]);
      expect(generateMoveSuggestions('e8=Q+')).toEqual([]);
      expect(generateMoveSuggestions('exd8=Q')).toEqual([]);
    });

    it('should return empty array for complete piece moves', () => {
      expect(generateMoveSuggestions('Nf3')).toEqual([]);
      expect(generateMoveSuggestions('Qd4')).toEqual([]);
      expect(generateMoveSuggestions('Bb5+')).toEqual([]);
      expect(generateMoveSuggestions('Re1#')).toEqual([]);
    });

    it('should return empty array for complete piece captures', () => {
      expect(generateMoveSuggestions('Nxe5')).toEqual([]);
      expect(generateMoveSuggestions('Qxd4+')).toEqual([]);
      expect(generateMoveSuggestions('Bxf7#')).toEqual([]);
    });

    it('should return empty array for complete disambiguated moves', () => {
      expect(generateMoveSuggestions('Nbd2')).toEqual([]);
      expect(generateMoveSuggestions('R1a1')).toEqual([]);
      expect(generateMoveSuggestions('Qh4e1')).toEqual([]);
      expect(generateMoveSuggestions('Nbxd2')).toEqual([]);
    });
  });

  describe('castling suggestions', () => {
    it('should suggest both castling options for "O"', () => {
      const suggestions = generateMoveSuggestions('O');
      expect(suggestions).toContain('O-O');
      expect(suggestions).toContain('O-O-O');
      expect(suggestions).toHaveLength(2);
    });

    it('should suggest both castling options for "O-"', () => {
      const suggestions = generateMoveSuggestions('O-');
      expect(suggestions).toContain('O-O');
      expect(suggestions).toContain('O-O-O');
      expect(suggestions).toHaveLength(2);
    });
  });

  describe('piece move suggestions', () => {
    it('should suggest all squares for piece symbol alone', () => {
      const suggestions = generateMoveSuggestions('N');
      expect(suggestions).toHaveLength(64); // 8 files * 8 ranks
      expect(suggestions).toContain('Na1');
      expect(suggestions).toContain('Nf3');
      expect(suggestions).toContain('Nh8');
    });

    it('should suggest all ranks for piece + file', () => {
      const suggestions = generateMoveSuggestions('Nf');
      expect(suggestions).toHaveLength(8);
      expect(suggestions).toContain('Nf1');
      expect(suggestions).toContain('Nf3');
      expect(suggestions).toContain('Nf8');
    });

    it('should suggest disambiguated moves for piece + rank', () => {
      const suggestions = generateMoveSuggestions('N1');
      expect(suggestions.length).toBeGreaterThan(0);
      // Each suggestion should include the rank disambiguation
      suggestions.forEach((s) => {
        expect(s).toMatch(/^N1[a-h]1$/);
      });
    });

    it('should suggest all ranks for piece + file disambiguation + destination file', () => {
      const suggestions = generateMoveSuggestions('Nbd');
      expect(suggestions).toHaveLength(8);
      expect(suggestions).toContain('Nbd1');
      expect(suggestions).toContain('Nbd2');
      expect(suggestions).toContain('Nbd8');
    });

    it('should suggest all ranks for piece + rank disambiguation + destination file', () => {
      const suggestions = generateMoveSuggestions('N1d');
      expect(suggestions).toHaveLength(8);
      expect(suggestions).toContain('N1d1');
      expect(suggestions).toContain('N1d2');
      expect(suggestions).toContain('N1d8');
    });
  });

  describe('piece capture suggestions', () => {
    it('should suggest all capture squares for piece + x', () => {
      const suggestions = generateMoveSuggestions('Bx');
      expect(suggestions).toHaveLength(64);
      expect(suggestions).toContain('Bxa1');
      expect(suggestions).toContain('Bxe4');
      expect(suggestions).toContain('Bxh8');
    });

    it('should suggest all ranks for piece + x + file', () => {
      const suggestions = generateMoveSuggestions('Bxb');
      expect(suggestions).toHaveLength(8);
      expect(suggestions).toContain('Bxb1');
      expect(suggestions).toContain('Bxb4');
      expect(suggestions).toContain('Bxb8');
    });

    it('should suggest captures with file disambiguation', () => {
      const suggestions = generateMoveSuggestions('Nfx');
      expect(suggestions).toHaveLength(64);
      expect(suggestions).toContain('Nfxa1');
      expect(suggestions).toContain('Nfxe4');
    });

    it('should suggest captures with rank disambiguation', () => {
      const suggestions = generateMoveSuggestions('N1x');
      expect(suggestions).toHaveLength(64);
      expect(suggestions).toContain('N1xa1');
      expect(suggestions).toContain('N1xe4');
    });

    it('should suggest all ranks for disambiguated capture + destination file', () => {
      const suggestions = generateMoveSuggestions('Nfxe');
      expect(suggestions).toHaveLength(8);
      expect(suggestions).toContain('Nfxe1');
      expect(suggestions).toContain('Nfxe4');
      expect(suggestions).toContain('Nfxe8');
    });
  });

  describe('pawn move suggestions', () => {
    it('should suggest all ranks for file alone', () => {
      const suggestions = generateMoveSuggestions('e');
      expect(suggestions).toHaveLength(8);
      expect(suggestions).toContain('e1');
      expect(suggestions).toContain('e4');
      expect(suggestions).toContain('e8');
    });

    it('should suggest promotion pieces for moves to 8th rank', () => {
      const suggestions = generateMoveSuggestions('e8');
      expect(suggestions).toHaveLength(4);
      expect(suggestions).toContain('e8=Q');
      expect(suggestions).toContain('e8=R');
      expect(suggestions).toContain('e8=B');
      expect(suggestions).toContain('e8=N');
    });

    it('should suggest promotion pieces for moves to 1st rank', () => {
      const suggestions = generateMoveSuggestions('a1');
      expect(suggestions).toHaveLength(4);
      expect(suggestions).toContain('a1=Q');
      expect(suggestions).toContain('a1=R');
      expect(suggestions).toContain('a1=B');
      expect(suggestions).toContain('a1=N');
    });
  });

  describe('pawn capture suggestions', () => {
    it('should suggest captures to adjacent files', () => {
      const suggestions = generateMoveSuggestions('ex');
      expect(suggestions.length).toBeGreaterThan(0);
      // e-file can capture to d or f files
      const hasD = suggestions.some((s) => s.includes('xd'));
      const hasF = suggestions.some((s) => s.includes('xf'));
      expect(hasD || hasF).toBe(true);
    });

    it('should suggest all ranks for specific capture file', () => {
      const suggestions = generateMoveSuggestions('exd');
      expect(suggestions).toHaveLength(8);
      expect(suggestions).toContain('exd1');
      expect(suggestions).toContain('exd4');
      expect(suggestions).toContain('exd8');
    });

    it('should suggest promotion pieces for capture to 8th rank', () => {
      const suggestions = generateMoveSuggestions('exd8');
      expect(suggestions).toHaveLength(4);
      expect(suggestions).toContain('exd8=Q');
      expect(suggestions).toContain('exd8=R');
      expect(suggestions).toContain('exd8=B');
      expect(suggestions).toContain('exd8=N');
    });

    it('should suggest promotion pieces for capture to 1st rank', () => {
      const suggestions = generateMoveSuggestions('bxa1');
      expect(suggestions).toHaveLength(4);
      expect(suggestions).toContain('bxa1=Q');
      expect(suggestions).toContain('bxa1=R');
      expect(suggestions).toContain('bxa1=B');
      expect(suggestions).toContain('bxa1=N');
    });

    it('should not suggest captures to non-adjacent files', () => {
      // a-file can only capture to b-file
      const suggestions = generateMoveSuggestions('axc');
      expect(suggestions).toHaveLength(0);
    });

    it('should suggest captures for edge files correctly', () => {
      // a-file can only capture to b-file
      const aSuggestions = generateMoveSuggestions('ax');
      expect(aSuggestions.every((s) => s.startsWith('axb'))).toBe(true);

      // h-file can only capture to g-file
      const hSuggestions = generateMoveSuggestions('hx');
      expect(hSuggestions.every((s) => s.startsWith('hxg'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle all piece types', () => {
      const pieces = ['K', 'Q', 'R', 'B', 'N'];
      pieces.forEach((piece) => {
        const suggestions = generateMoveSuggestions(piece);
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0].startsWith(piece)).toBe(true);
      });
    });

    it('should handle all files', () => {
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      files.forEach((file) => {
        const suggestions = generateMoveSuggestions(file);
        expect(suggestions).toHaveLength(8);
        expect(suggestions[0].startsWith(file)).toBe(true);
      });
    });

    it('should handle input with leading/trailing whitespace', () => {
      const suggestions = generateMoveSuggestions('  N  ');
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});

describe('buildCompletePattern', () => {
  it('anchors the body with ^ and $', () => {
    const re = buildCompletePattern('[a-h][2-7]');
    expect(re.source).toBe('^[a-h][2-7](\\+|#)?$');
    expect(re.test('e4')).toBe(true);
    expect(re.test('xe4')).toBe(false);
    expect(re.test('e4x')).toBe(false);
  });

  it('accepts optional + and # suffix', () => {
    const re = buildCompletePattern('[KQRBN][a-h][1-8]');
    expect(re.test('Nf3')).toBe(true);
    expect(re.test('Nf3+')).toBe(true);
    expect(re.test('Nf3#')).toBe(true);
    expect(re.test('Nf3++')).toBe(false);
    expect(re.test('Nf3?')).toBe(false);
  });

  it('is equivalent to the original hand-written patterns', () => {
    // The 12 legacy patterns, copied verbatim. A refactor that preserves
    // behavior must match on the same set of inputs.
    const legacy: readonly [RegExp, string][] = [
      [/^[a-h][2-7](\+|#)?$/, '[a-h][2-7]'],
      [/^[a-h]x[a-h][2-7](\+|#)?$/, '[a-h]x[a-h][2-7]'],
      [/^[a-h][1-8]=[QRBN](\+|#)?$/, '[a-h][1-8]=[QRBN]'],
      [/^[a-h]x[a-h][1-8]=[QRBN](\+|#)?$/, '[a-h]x[a-h][1-8]=[QRBN]'],
      [/^[KQRBN][a-h][1-8](\+|#)?$/, '[KQRBN][a-h][1-8]'],
      [/^[KQRBN]x[a-h][1-8](\+|#)?$/, '[KQRBN]x[a-h][1-8]'],
      [/^[KQRBN][a-h][a-h][1-8](\+|#)?$/, '[KQRBN][a-h][a-h][1-8]'],
      [/^[KQRBN][1-8][a-h][1-8](\+|#)?$/, '[KQRBN][1-8][a-h][1-8]'],
      [/^[KQRBN][a-h][1-8][a-h][1-8](\+|#)?$/, '[KQRBN][a-h][1-8][a-h][1-8]'],
      [/^[KQRBN][a-h]x[a-h][1-8](\+|#)?$/, '[KQRBN][a-h]x[a-h][1-8]'],
      [/^[KQRBN][1-8]x[a-h][1-8](\+|#)?$/, '[KQRBN][1-8]x[a-h][1-8]'],
      [/^[KQRBN][a-h][1-8]x[a-h][1-8](\+|#)?$/, '[KQRBN][a-h][1-8]x[a-h][1-8]'],
    ];

    const sampleInputs = [
      'e4',
      'e4+',
      'e4#',
      'exd5',
      'exd5+',
      'e8=Q',
      'e8=Q+',
      'exd8=Q',
      'exd8=Q#',
      'Nf3',
      'Nf3+',
      'Nxe5',
      'Qxd4#',
      'Nbd2',
      'Rad1+',
      'N1d2',
      'R1a1#',
      'Nb1d2',
      'Nbxd2',
      'Nfxe5',
      'R1xd1',
      'Nb1xe5',
      // Negative cases
      '',
      'e9',
      'Zxe5',
      'Nf3??',
      'O-O',
      'abc',
    ];

    for (const [legacyRe, body] of legacy) {
      const rebuilt = buildCompletePattern(body);
      for (const input of sampleInputs) {
        expect(rebuilt.test(input)).toBe(legacyRe.test(input));
      }
    }
  });
});
