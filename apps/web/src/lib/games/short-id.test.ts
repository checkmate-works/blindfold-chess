import { describe, expect, it } from 'vitest';

import { decodeGameShortId, encodeGameShortId } from './short-id';

describe('encodeGameShortId', () => {
  it('renders a UUID as 22 URL-safe characters', () => {
    const code = encodeGameShortId('019f8e93-32ad-750e-894e-267acf1575e2');

    expect(code).toBe('AZ-OkzKtdQ6JTiZ6zxV14g');
    expect(code).toHaveLength(22);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('emits no characters that need percent-encoding in a URL', () => {
    // '+' and '/' from standard base64 would both survive a naive copy-paste
    // but change meaning in a path segment.
    const codes = [
      '00000000-0000-0000-0000-0000000000ff',
      'ffffffff-ffff-ffff-ffff-fffffffffffe',
      '3ef97fbf-0000-0000-0000-000000000000',
    ].map(encodeGameShortId);

    for (const code of codes) {
      expect(encodeURIComponent(code)).toBe(code);
    }
  });
});

describe('decodeGameShortId', () => {
  it('round-trips every UUID it encodes', () => {
    const ids = [
      '019f8e93-32ad-750e-894e-267acf1575e2',
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      '3ef97fbf-8bc5-4a1d-9e0f-2c7a15d3b604',
    ];

    for (const id of ids) {
      expect(decodeGameShortId(encodeGameShortId(id))).toBe(id);
    }
  });

  it('normalizes an uppercase UUID to its canonical lowercase form', () => {
    expect(decodeGameShortId(encodeGameShortId('019F8E93-32AD-750E-894E-267ACF1575E2'))).toBe(
      '019f8e93-32ad-750e-894e-267acf1575e2'
    );
  });

  it('rejects malformed codes without decoding', () => {
    const rejected = [
      '',
      'AZ-OkzKtdQ6JTiZ6zxV14', // truncated (21 chars)
      'AZ-OkzKtdQ6JTiZ6zxV14gg', // too long (23 chars)
      'AZ-OkzKtdQ6JTiZ6zxV14+', // standard-base64 char
      'AZ/OkzKtdQ6JTiZ6zxV14g', // standard-base64 char
      'AZ-OkzKtdQ6JTiZ6zxV14=', // padding
      '019f8e93-32ad-750e-894e-267acf1575e2', // a raw UUID is not a code
    ];

    for (const code of rejected) {
      expect(decodeGameShortId(code)).toBeNull();
    }
  });
});
