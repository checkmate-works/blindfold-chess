import { describe, expect, it } from 'vitest';

import { sanitizeFenCaption } from './sanitize-fen-caption';

describe('sanitizeFenCaption', () => {
  it('returns null for null / undefined input', () => {
    expect(sanitizeFenCaption(null)).toBeNull();
    expect(sanitizeFenCaption(undefined)).toBeNull();
  });

  it('returns null for empty / whitespace-only input', () => {
    expect(sanitizeFenCaption('')).toBeNull();
    expect(sanitizeFenCaption('   ')).toBeNull();
  });

  it('passes through normal text unchanged', () => {
    expect(sanitizeFenCaption('Tactical motif from a Najdorf middlegame')).toBe(
      'Tactical motif from a Najdorf middlegame'
    );
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeFenCaption('  knight fork  ')).toBe('knight fork');
  });

  it('strips bidi overrides (Trojan Source)', () => {
    const value = `evil${String.fromCharCode(0x202e)}caption`;
    expect(sanitizeFenCaption(value)).toBe('evilcaption');
  });

  it('strips zero-width characters', () => {
    const value = `tac${String.fromCharCode(0x200b)}tic`;
    expect(sanitizeFenCaption(value)).toBe('tactic');
  });

  it('strips ASCII control characters', () => {
    const withControls = `A${String.fromCharCode(0)}B`;
    expect(sanitizeFenCaption(withControls)).toBe('AB');
  });

  it('caps caption at 200 characters', () => {
    const long = 'x'.repeat(500);
    const result = sanitizeFenCaption(long);
    expect(result?.length).toBe(200);
  });

  it('preserves CJK / accented Latin text', () => {
    expect(sanitizeFenCaption('ナイトフォーク')).toBe('ナイトフォーク');
    expect(sanitizeFenCaption('São Paulo')).toBe('São Paulo');
  });

  it('returns null when input is ONLY invisible characters', () => {
    const value = String.fromCharCode(0x202e) + String.fromCharCode(0x200b);
    expect(sanitizeFenCaption(value)).toBeNull();
  });
});
