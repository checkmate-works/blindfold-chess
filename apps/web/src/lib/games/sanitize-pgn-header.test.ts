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

    // ─── Phase H: extended invisible / formatter coverage ───
    it('strips ARABIC LETTER MARK (U+061C, Bidi_Control)', () => {
      // U+061C is an Arabic-script bidi formatter that, like the
      // U+202A..U+202E family, can flip rendered text without
      // changing the underlying codepoints. Coverage gap noted in
      // Phase G review.
      const value = `Magnus${String.fromCharCode(0x061c)}Carlsen`;
      expect(sanitizePgnHeader(value)).toBe('MagnusCarlsen');
    });

    it('strips MONGOLIAN VOWEL SEPARATOR (U+180E)', () => {
      // U+180E is deprecated but still rendered as zero-width and
      // accepted by most pipelines — abusable as an invisible
      // separator that defeats exact-match comparisons.
      const value = `A${String.fromCharCode(0x180e)}B`;
      expect(sanitizePgnHeader(value)).toBe('AB');
    });

    it('strips Musical Symbol formatter U+1D173 (MUSICAL SYMBOL BEGIN BEAM)', () => {
      // Supplementary-plane formatter; requires the regex `u` flag to
      // match the surrogate pair correctly.
      const value = `A${String.fromCodePoint(0x1d173)}B`;
      expect(sanitizePgnHeader(value)).toBe('AB');
    });

    it('strips the full Musical Symbol formatter range U+1D173..U+1D17A', () => {
      // The whole 8-codepoint formatter block must be stripped, not
      // just the boundary points. Spot-check the middle of the range.
      const middle = String.fromCodePoint(0x1d177);
      const value = `X${middle}Y`;
      expect(sanitizePgnHeader(value)).toBe('XY');
    });

    it('strips TAG character U+E0001 LANGUAGE TAG', () => {
      // U+E0001 is the entry point of the TAG block — the classic
      // "ghost text" / invisible-watermark vector.
      const value = `A${String.fromCodePoint(0xe0001)}B`;
      expect(sanitizePgnHeader(value)).toBe('AB');
    });

    it('strips TAG SPACE (U+E0020)', () => {
      // U+E0020 maps to ASCII space inside the TAG namespace — the
      // start of the printable TAG range.
      const value = `Hi${String.fromCodePoint(0xe0020)}karu`;
      expect(sanitizePgnHeader(value)).toBe('Hikaru');
    });

    it('strips CANCEL TAG (U+E007F)', () => {
      // U+E007F is the closing terminator for a TAG sequence — the
      // last codepoint in the block.
      const value = `Foo${String.fromCodePoint(0xe007f)}Bar`;
      expect(sanitizePgnHeader(value)).toBe('FooBar');
    });

    it('strips a long TAG-encoded payload entirely', () => {
      // Encode "evil" using the standard TAG mapping (TAG version of
      // ASCII char `c` = U+E0000 + codePointOf(c)). Every TAG char
      // here lands in U+E0020..U+E007F, the printable TAG range.
      // After sanitization the payload must be gone but legitimate
      // prefix/suffix preserved.
      const tagged =
        String.fromCodePoint(0xe0000 + 'e'.charCodeAt(0)) +
        String.fromCodePoint(0xe0000 + 'v'.charCodeAt(0)) +
        String.fromCodePoint(0xe0000 + 'i'.charCodeAt(0)) +
        String.fromCodePoint(0xe0000 + 'l'.charCodeAt(0));
      const value = `Magnus${tagged}Carlsen`;
      expect(sanitizePgnHeader(value)).toBe('MagnusCarlsen');
    });

    it('returns null when input is ONLY supplementary-plane formatters', () => {
      const value =
        String.fromCodePoint(0x1d173) +
        String.fromCodePoint(0xe0001) +
        String.fromCodePoint(0xe0020);
      expect(sanitizePgnHeader(value)).toBeNull();
    });

    // ─── Phase I: range-boundary regression coverage ───
    //
    // The strip regex includes two supplementary-plane ranges:
    //   - U+1D173..U+1D17A Musical Symbol formatters
    //   - U+E0020..U+E007F TAG printable range (plus the standalone
    //     U+E0001 LANG TAG)
    //
    // A range mistake of one codepoint either way (`{1D172,1D17B}` or
    // `{E001F,E0080}`) would silently widen or narrow the strip without
    // changing any of the existing assertions. These tests pin every
    // boundary codepoint individually so a future regex tweak that
    // misnames a boundary fails here in CI rather than weakening the
    // invariant in production.
    it('preserves U+1D172 (one BELOW the Musical Symbol formatter range)', () => {
      // U+1D172 is MUSICAL SYMBOL COMBINING TREMOLO-3 — a real glyph,
      // not a zero-width formatter. Stripping it would be over-broad.
      const just_before = String.fromCodePoint(0x1d172);
      const value = `A${just_before}B`;
      expect(sanitizePgnHeader(value)).toBe(value);
    });

    it('preserves U+1D17B (one ABOVE the Musical Symbol formatter range)', () => {
      // U+1D17B is MUSICAL SYMBOL COMBINING ACCENT — also a glyph, not
      // a formatter. Same range-boundary regression check.
      const just_after = String.fromCodePoint(0x1d17b);
      const value = `A${just_after}B`;
      expect(sanitizePgnHeader(value)).toBe(value);
    });

    it('preserves U+E001F (one BELOW the printable TAG range)', () => {
      // U+E001F sits between U+E0001 LANGUAGE TAG (stripped as a
      // standalone codepoint) and U+E0020 TAG SPACE (start of the
      // printable TAG block we strip). Stripping U+E001F would imply
      // that the regex is matching the *whole* TAG block instead of
      // the documented {U+E0001} + [U+E0020..U+E007F] union.
      const just_before = String.fromCodePoint(0xe001f);
      const value = `A${just_before}B`;
      expect(sanitizePgnHeader(value)).toBe(value);
    });

    it('preserves U+E0080 (one ABOVE the printable TAG range)', () => {
      // U+E0080 is the first codepoint above U+E007F CANCEL TAG.
      // Stripping it would also imply an over-wide regex.
      const just_after = String.fromCodePoint(0xe0080);
      const value = `A${just_after}B`;
      expect(sanitizePgnHeader(value)).toBe(value);
    });

    it('preserves U+E0002 (TAG block but NOT in the stripped subset)', () => {
      // The strip covers U+E0001 (LANG TAG) and the printable subrange
      // U+E0020..U+E007F. Codepoints in between (e.g. U+E0002) are
      // intentionally NOT stripped. This pins the precise shape of the
      // alternation — a future tweak that broadens to the whole
      // U+E0001..U+E007F block would fail this test.
      const middle = String.fromCodePoint(0xe0002);
      const value = `A${middle}B`;
      expect(sanitizePgnHeader(value)).toBe(value);
    });

    it('preserves U+E0000 (one BELOW the LANG TAG codepoint)', () => {
      const value = `A${String.fromCodePoint(0xe0000)}B`;
      expect(sanitizePgnHeader(value)).toBe(value);
    });

    it('strips a long, mixed run of bidi + zero-width + TAG codepoints in one pass', () => {
      // Defense-in-depth probe: build a string that combines codepoints
      // from every covered class to confirm a single replace() pass
      // removes them all (the `g` flag must be live and the
      // alternation must cover all branches in one regex). If a future
      // edit accidentally drops the `g` flag, only the first match
      // would be removed and this test would fail.
      const payload =
        String.fromCharCode(0x202e) + // RLO
        String.fromCharCode(0x200b) + // ZWSP
        String.fromCharCode(0x200c) + // ZWNJ
        String.fromCharCode(0x200d) + // ZWJ
        String.fromCharCode(0x2060) + // WJ
        String.fromCharCode(0xfeff) + // BOM
        String.fromCharCode(0x061c) + // ALM
        String.fromCharCode(0x180e) + // MVS
        String.fromCharCode(0x2066) + // LRI
        String.fromCharCode(0x2069) + // PDI
        String.fromCodePoint(0x1d173) + // Musical formatter
        String.fromCodePoint(0xe0001) + // LANG TAG
        String.fromCodePoint(0xe0020) + // TAG SPACE
        String.fromCodePoint(0xe007f); // CANCEL TAG
      const value = `Magnus${payload}Carlsen`;
      expect(sanitizePgnHeader(value)).toBe('MagnusCarlsen');
    });

    it('strips repeated runs of the same bidi codepoint (regex global flag regression)', () => {
      // The classic "drop the /g flag" regression: with /g missing the
      // first U+202E would be removed but the four trailing copies
      // would survive. Pin this so a future edit cannot silently
      // weaken the strip to a single pass per character class.
      const rlo = String.fromCharCode(0x202e);
      const value = `A${rlo}${rlo}${rlo}${rlo}${rlo}B`;
      expect(sanitizePgnHeader(value)).toBe('AB');
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
