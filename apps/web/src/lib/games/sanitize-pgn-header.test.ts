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
});
