import { describe, expect, it } from 'vitest';

import { sanitizeUserText } from './sanitize-user-text';

describe('sanitizeUserText', () => {
  it('returns null for null / undefined / non-string input', () => {
    expect(sanitizeUserText(null, { maxLength: 200 })).toBeNull();
    expect(sanitizeUserText(undefined, { maxLength: 200 })).toBeNull();
    // @ts-expect-error -- intentional bad input
    expect(sanitizeUserText(42, { maxLength: 200 })).toBeNull();
  });

  it('returns null for empty / whitespace-only strings', () => {
    expect(sanitizeUserText('', { maxLength: 200 })).toBeNull();
    expect(sanitizeUserText('   ', { maxLength: 200 })).toBeNull();
    expect(sanitizeUserText('\t\n  ', { maxLength: 200 })).toBeNull();
  });

  it('passes through normal text unchanged', () => {
    expect(sanitizeUserText('Sicilian Defense', { maxLength: 200 })).toBe('Sicilian Defense');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeUserText('  hello  ', { maxLength: 200 })).toBe('hello');
  });

  it('strips ASCII C0 control characters', () => {
    const withControls = `A${String.fromCharCode(0)}B${String.fromCharCode(7)}`;
    expect(sanitizeUserText(withControls, { maxLength: 200 })).toBe('AB');
  });

  it('strips DEL (0x7F)', () => {
    expect(sanitizeUserText(`A${String.fromCharCode(0x7f)}B`, { maxLength: 200 })).toBe('AB');
  });

  it('strips embedded CR/LF', () => {
    expect(sanitizeUserText(`A\r\nB`, { maxLength: 200 })).toBe('AB');
  });

  it('respects an arbitrary maxLength', () => {
    const long = 'x'.repeat(500);
    expect(sanitizeUserText(long, { maxLength: 50 })?.length).toBe(50);
    expect(sanitizeUserText(long, { maxLength: 10 })?.length).toBe(10);
  });

  it('strips bidi overrides', () => {
    const value = `evil${String.fromCharCode(0x202e)}site.com`;
    expect(sanitizeUserText(value, { maxLength: 200 })).toBe('evilsite.com');
  });

  it('strips zero-width family', () => {
    const value = `Hi${String.fromCharCode(0x200b)}karu`;
    expect(sanitizeUserText(value, { maxLength: 200 })).toBe('Hikaru');
  });

  it('strips supplementary-plane TAG codepoints', () => {
    const value = `A${String.fromCodePoint(0xe0001)}B${String.fromCodePoint(0xe0020)}C`;
    expect(sanitizeUserText(value, { maxLength: 200 })).toBe('ABC');
  });

  it('strips Musical Symbol formatters', () => {
    const value = `A${String.fromCodePoint(0x1d173)}B`;
    expect(sanitizeUserText(value, { maxLength: 200 })).toBe('AB');
  });

  it('returns null when input is ONLY invisible characters', () => {
    const value =
      String.fromCharCode(0x202e) + String.fromCharCode(0x200b) + String.fromCodePoint(0xe0001);
    expect(sanitizeUserText(value, { maxLength: 200 })).toBeNull();
  });

  it('preserves Unicode (non-ASCII) text', () => {
    expect(sanitizeUserText('日本語', { maxLength: 200 })).toBe('日本語');
    expect(sanitizeUserText('São Paulo', { maxLength: 200 })).toBe('São Paulo');
  });
});
