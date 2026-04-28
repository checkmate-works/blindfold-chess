import { describe, expect, it } from 'vitest';

import { sanitizePgnHeader } from './sanitize-pgn-header';

describe('sanitizePgnHeader', () => {
  it('returns null for null / undefined / non-string input', () => {
    expect(sanitizePgnHeader(null)).toBeNull();
    expect(sanitizePgnHeader(undefined)).toBeNull();
    // @ts-expect-error -- intentional bad input
    expect(sanitizePgnHeader(42)).toBeNull();
  });

  it('returns null for empty / whitespace-only strings', () => {
    expect(sanitizePgnHeader('')).toBeNull();
    expect(sanitizePgnHeader('   ')).toBeNull();
    expect(sanitizePgnHeader('\t\n  ')).toBeNull();
  });

  it('passes through normal text unchanged', () => {
    expect(sanitizePgnHeader('Magnus Carlsen')).toBe('Magnus Carlsen');
    expect(sanitizePgnHeader('Sicilian Defense')).toBe('Sicilian Defense');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizePgnHeader('  Hikaru  ')).toBe('Hikaru');
  });

  it('strips ASCII C0 control characters', () => {
    const withControls = `Alice${String.fromCharCode(0)}Bob${String.fromCharCode(7)}`;
    expect(sanitizePgnHeader(withControls)).toBe('AliceBob');
  });

  it('strips DEL (0x7F)', () => {
    const withDel = `Foo${String.fromCharCode(0x7f)}Bar`;
    expect(sanitizePgnHeader(withDel)).toBe('FooBar');
  });

  it('strips embedded CR/LF (line break injection)', () => {
    const cr = String.fromCharCode(13);
    const lf = String.fromCharCode(10);
    expect(sanitizePgnHeader(`A${cr}${lf}B`)).toBe('AB');
  });

  it('caps length at 200 chars', () => {
    const long = 'x'.repeat(500);
    const result = sanitizePgnHeader(long);
    expect(result).not.toBeNull();
    expect(result?.length).toBe(200);
  });

  it('preserves Unicode (non-ASCII) text', () => {
    expect(sanitizePgnHeader('日本選手権')).toBe('日本選手権');
    expect(sanitizePgnHeader('São Paulo')).toBe('São Paulo');
  });

  it('returns null when only control characters are present', () => {
    const onlyControls = `${String.fromCharCode(0)}${String.fromCharCode(7)}${String.fromCharCode(0x7f)}`;
    expect(sanitizePgnHeader(onlyControls)).toBeNull();
  });

  // ─── Additional Tester-pass coverage ───
  describe('null byte handling', () => {
    it('strips a leading null byte', () => {
      expect(sanitizePgnHeader(`${String.fromCharCode(0)}Alice`)).toBe('Alice');
    });

    it('strips an embedded null byte without truncating subsequent text', () => {
      const value = `Alice${String.fromCharCode(0)}Bob`;
      expect(sanitizePgnHeader(value)).toBe('AliceBob');
    });

    it('returns null when input is a single null byte', () => {
      expect(sanitizePgnHeader(String.fromCharCode(0))).toBeNull();
    });
  });

  describe('multibyte unicode preservation', () => {
    it('preserves Japanese (CJK)', () => {
      expect(sanitizePgnHeader('心眼チェス')).toBe('心眼チェス');
    });

    it('preserves emoji (surrogate pair)', () => {
      expect(sanitizePgnHeader('Magnus 👑')).toBe('Magnus 👑');
    });

    it('preserves accented Latin', () => {
      expect(sanitizePgnHeader('Vlădescu')).toBe('Vlădescu');
    });

    it('preserves Cyrillic', () => {
      expect(sanitizePgnHeader('Каспаров')).toBe('Каспаров');
    });
  });

  describe('whitespace contract', () => {
    it('trims leading whitespace', () => {
      expect(sanitizePgnHeader('   Hikaru')).toBe('Hikaru');
    });

    it('trims trailing whitespace', () => {
      expect(sanitizePgnHeader('Hikaru   ')).toBe('Hikaru');
    });

    it('preserves internal whitespace verbatim', () => {
      // The contract trims surrounding whitespace but does NOT collapse
      // internal whitespace runs.
      expect(sanitizePgnHeader('Magnus    Carlsen')).toBe('Magnus    Carlsen');
    });
  });

  // ─── M-4: Trojan Source / bidi & zero-width strip ───
  describe('bidi and zero-width strip (CVE-2021-42574 class)', () => {
    it('strips RIGHT-TO-LEFT OVERRIDE (U+202E)', () => {
      // The classic Trojan Source vector: `evil` followed by U+202E
      // and `site.com` would render as `evilmoc.etis` in the card.
      // After sanitization the codepoint is gone and the visible text
      // matches the stored bytes.
      const value = `evil${String.fromCharCode(0x202e)}site.com`;
      expect(sanitizePgnHeader(value)).toBe('evilsite.com');
    });

    it('strips LEFT-TO-RIGHT OVERRIDE (U+202D)', () => {
      const value = `Magnus${String.fromCharCode(0x202d)}Carlsen`;
      expect(sanitizePgnHeader(value)).toBe('MagnusCarlsen');
    });

    it('strips PDF / pop-direction-formatting (U+202C) and embeddings (U+202A, U+202B)', () => {
      const lre = String.fromCharCode(0x202a);
      const rle = String.fromCharCode(0x202b);
      const pdf = String.fromCharCode(0x202c);
      expect(sanitizePgnHeader(`A${lre}B${rle}C${pdf}D`)).toBe('ABCD');
    });

    it('strips bidi isolates (U+2066..U+2069)', () => {
      // LEFT-TO-RIGHT ISOLATE / RIGHT-TO-LEFT ISOLATE / FIRST-STRONG /
      // POP DIRECTIONAL ISOLATE — newer (Unicode 6.3+) vectors with
      // the same display-reorder effect.
      const lri = String.fromCharCode(0x2066);
      const rli = String.fromCharCode(0x2067);
      const fsi = String.fromCharCode(0x2068);
      const pdi = String.fromCharCode(0x2069);
      expect(sanitizePgnHeader(`A${lri}B${rli}C${fsi}D${pdi}E`)).toBe('ABCDE');
    });

    it('strips zero-width space (U+200B)', () => {
      // Zero-width separator (U+200B inside): `Hi<ZWSP>karu` and `Hikaru` look identical
      // but compare unequal — useful for impersonation / bypassing
      // exact-match moderation rules. Strip so the stored value
      // matches what a moderator sees.
      const value = `Hi${String.fromCharCode(0x200b)}karu`;
      expect(sanitizePgnHeader(value)).toBe('Hikaru');
    });

    it('strips zero-width non-joiner / joiner (U+200C, U+200D)', () => {
      const value = `A${String.fromCharCode(0x200c)}B${String.fromCharCode(0x200d)}C`;
      expect(sanitizePgnHeader(value)).toBe('ABC');
    });

    it('strips word joiner (U+2060) and zero-width no-break space / BOM (U+FEFF)', () => {
      const value = `X${String.fromCharCode(0x2060)}Y${String.fromCharCode(0xfeff)}Z`;
      expect(sanitizePgnHeader(value)).toBe('XYZ');
    });

    it('returns null when the input is ONLY bidi / zero-width chars', () => {
      const value =
        String.fromCharCode(0x202e) + String.fromCharCode(0x200b) + String.fromCharCode(0xfeff);
      expect(sanitizePgnHeader(value)).toBeNull();
    });

    it('preserves legitimate bidi-rich strings after the override is stripped', () => {
      // Hebrew name with no override — must pass through unchanged.
      // (The strip targets the *override* codepoints, not the right-
      // to-left letters themselves.)
      const hebrew = 'דוד';
      expect(sanitizePgnHeader(hebrew)).toBe(hebrew);
    });
  });

  describe('length cap boundary', () => {
    it('preserves exactly 200 chars unchanged', () => {
      const exactly200 = 'x'.repeat(200);
      expect(sanitizePgnHeader(exactly200)).toBe(exactly200);
    });

    it('caps at 200 chars when input is 201 chars', () => {
      const result = sanitizePgnHeader('y'.repeat(201));
      expect(result?.length).toBe(200);
    });
  });
});
