// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_PEEK_HINT,
  PEEK_COOKIE_MAX_AGE_SEC,
  PEEK_COOKIE_NAME,
  type PeekPreferenceHint,
  encodePeekCookie,
  parsePeekCookie,
  writePeekPreferenceCookie,
} from './peek-cookie';

describe('encodePeekCookie', () => {
  it('encodes { peekMode: "modal", boardVisibility: "peek" } as "modal|peek"', () => {
    expect(encodePeekCookie({ peekMode: 'modal', boardVisibility: 'peek' })).toBe('modal|peek');
  });

  it('encodes { peekMode: "modal", boardVisibility: "never" } as "modal|never"', () => {
    expect(encodePeekCookie({ peekMode: 'modal', boardVisibility: 'never' })).toBe('modal|never');
  });

  it('encodes { peekMode: "inline", boardVisibility: "always" } as "inline|always"', () => {
    expect(encodePeekCookie({ peekMode: 'inline', boardVisibility: 'always' })).toBe(
      'inline|always'
    );
  });

  it('encodes { peekMode: "inline", boardVisibility: "peek" } as "inline|peek"', () => {
    expect(encodePeekCookie({ peekMode: 'inline', boardVisibility: 'peek' })).toBe('inline|peek');
  });
});

describe('parsePeekCookie — new wire format', () => {
  describe('valid inputs', () => {
    it.each([
      ['modal|always', { peekMode: 'modal', boardVisibility: 'always' }],
      ['modal|peek', { peekMode: 'modal', boardVisibility: 'peek' }],
      ['modal|never', { peekMode: 'modal', boardVisibility: 'never' }],
      ['inline|always', { peekMode: 'inline', boardVisibility: 'always' }],
      ['inline|peek', { peekMode: 'inline', boardVisibility: 'peek' }],
      ['inline|never', { peekMode: 'inline', boardVisibility: 'never' }],
    ] as const)('parses %s correctly', (raw, expected) => {
      expect(parsePeekCookie(raw)).toEqual(expected);
    });
  });

  describe('empty / null / undefined', () => {
    it('returns the default hint for empty string', () => {
      expect(parsePeekCookie('')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint for undefined', () => {
      expect(parsePeekCookie(undefined)).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint for null', () => {
      expect(parsePeekCookie(null)).toEqual(DEFAULT_PEEK_HINT);
    });
  });

  describe('unknown peekMode tokens', () => {
    it('returns the default hint when the mode token is unknown ("bogus|peek")', () => {
      expect(parsePeekCookie('bogus|peek')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('is case-sensitive: uppercased "MODAL|peek" is rejected as unknown', () => {
      expect(parsePeekCookie('MODAL|peek')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('is case-sensitive: mixed-case "Modal|peek" is rejected as unknown', () => {
      expect(parsePeekCookie('Modal|peek')).toEqual(DEFAULT_PEEK_HINT);
    });
  });

  describe('malformed visibility tokens', () => {
    it('returns the default hint for "modal|yes"', () => {
      expect(parsePeekCookie('modal|yes')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint for "modal|true"', () => {
      expect(parsePeekCookie('modal|true')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint when the visibility token is empty ("modal|")', () => {
      expect(parsePeekCookie('modal|')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint when the pipe is missing entirely ("modal")', () => {
      expect(parsePeekCookie('modal')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint for unknown visibility values ("modal|sometimes")', () => {
      expect(parsePeekCookie('modal|sometimes')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('is case-sensitive: uppercased visibility "modal|PEEK" is rejected', () => {
      expect(parsePeekCookie('modal|PEEK')).toEqual(DEFAULT_PEEK_HINT);
    });
  });

  describe('separator anomalies', () => {
    it('returns the default hint when there are consecutive pipes ("modal||peek")', () => {
      expect(parsePeekCookie('modal||peek')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint for only-pipes input ("||")', () => {
      expect(parsePeekCookie('||')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('keeps the first two segments and ignores trailing extras ("modal|peek|extra")', () => {
      // Documented behavior: `split('|')` yields ['modal', 'peek', 'extra'];
      // the parser only consumes the first two segments. Pinning this so any
      // future tightening is intentional and reviewable.
      expect(parsePeekCookie('modal|peek|extra')).toEqual({
        peekMode: 'modal',
        boardVisibility: 'peek',
      });
    });
  });

  describe('whitespace handling', () => {
    it('does NOT trim trailing whitespace in the visibility slot ("modal|peek ")', () => {
      expect(parsePeekCookie('modal|peek ')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('does NOT trim leading whitespace in the peekMode slot (" modal|peek")', () => {
      expect(parsePeekCookie(' modal|peek')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('does NOT accept internal whitespace around the pipe ("modal | peek")', () => {
      expect(parsePeekCookie('modal | peek')).toEqual(DEFAULT_PEEK_HINT);
    });
  });

  describe('boundary / untrusted input', () => {
    it('tolerates very long untrusted input (>1000 chars) without throwing', () => {
      const longGarbage = 'x'.repeat(10_000);
      const result = parsePeekCookie(longGarbage);
      expect(result).toEqual(DEFAULT_PEEK_HINT);
    });

    it('tolerates a very long trailing visibility slot without throwing', () => {
      const longVisibility = `modal|${'p'.repeat(10_000)}`;
      const result = parsePeekCookie(longVisibility);
      // 'ppp...' is not a valid BoardVisibility, so it's malformed → default.
      expect(result).toEqual(DEFAULT_PEEK_HINT);
    });
  });
});

describe('parsePeekCookie — legacy back-compat', () => {
  // The cookie's wire format used to encode the trailing slot as the legacy
  // boolean `showBoardButtonInGame` (`'1'` or `'0'`). After the rename,
  // existing cookies on disk must still decode to a sensible hint until the
  // next preference update rewrites them in the new format. The mapping
  // mirrors `legacyToBoardVisibility`:
  //   '1' (showBoardButton=true)  → boardVisibility: 'peek'
  //   '0' (showBoardButton=false) → boardVisibility: 'never'
  it.each([
    ['modal|1', { peekMode: 'modal', boardVisibility: 'peek' }],
    ['modal|0', { peekMode: 'modal', boardVisibility: 'never' }],
    ['inline|1', { peekMode: 'inline', boardVisibility: 'peek' }],
    ['inline|0', { peekMode: 'inline', boardVisibility: 'never' }],
  ] as const)('legacy %s decodes to %o', (raw, expected) => {
    expect(parsePeekCookie(raw)).toEqual(expected);
  });

  it('rejects out-of-band legacy-looking tokens ("modal|2")', () => {
    // Only the exact tokens '1' / '0' are recognized as legacy; '2' is neither
    // a legacy boolean nor a valid BoardVisibility, so the parser falls back.
    expect(parsePeekCookie('modal|2')).toEqual(DEFAULT_PEEK_HINT);
  });
});

describe('parse ↔ encode round-trip', () => {
  const cases: PeekPreferenceHint[] = [
    { peekMode: 'modal', boardVisibility: 'always' },
    { peekMode: 'modal', boardVisibility: 'peek' },
    { peekMode: 'modal', boardVisibility: 'never' },
    { peekMode: 'inline', boardVisibility: 'always' },
    { peekMode: 'inline', boardVisibility: 'peek' },
    { peekMode: 'inline', boardVisibility: 'never' },
  ];

  it.each(cases)('parse(encode($peekMode, $boardVisibility)) === input', (hint) => {
    expect(parsePeekCookie(encodePeekCookie(hint))).toEqual(hint);
  });

  it('is idempotent when applied twice (parse∘encode∘parse∘encode)', () => {
    const hint: PeekPreferenceHint = { peekMode: 'inline', boardVisibility: 'always' };
    const once = parsePeekCookie(encodePeekCookie(hint));
    const twice = parsePeekCookie(encodePeekCookie(once));
    expect(twice).toEqual(hint);
  });
});

/**
 * Cookie write behavior. jsdom exposes `document.cookie` as a real accessor,
 * so we assert on the string written. `IS_LOCAL_DEV` resolves to a truthy
 * value in the test environment (no `NODE_ENV=production`, no production
 * `NEXT_PUBLIC_SITE_URL`), which matches the move-input-cookie probe coverage
 * and means the `Secure` flag is omitted in these assertions.
 */
describe('writePeekPreferenceCookie', () => {
  function clearCookie(): void {
    document.cookie = `${PEEK_COOKIE_NAME}=; Path=/; Max-Age=0`;
  }

  function readCookieEntry(): string | null {
    const parts = document.cookie.split(';').map((p) => p.trim());
    return parts.find((p) => p.startsWith(`${PEEK_COOKIE_NAME}=`)) ?? null;
  }

  beforeEach(() => {
    clearCookie();
  });

  afterEach(() => {
    clearCookie();
  });

  it('writes a cookie named "bfc_peek_pref"', () => {
    writePeekPreferenceCookie({ peekMode: 'modal', boardVisibility: 'peek' });
    const entry = readCookieEntry();
    expect(entry).not.toBeNull();
    expect(entry!.startsWith(`${PEEK_COOKIE_NAME}=`)).toBe(true);
  });

  it('writes the encoded value after the "=" sign', () => {
    const hint: PeekPreferenceHint = { peekMode: 'inline', boardVisibility: 'always' };
    writePeekPreferenceCookie(hint);
    const entry = readCookieEntry();
    expect(entry).toBe(`${PEEK_COOKIE_NAME}=${encodePeekCookie(hint)}`);
  });

  it.each([
    { peekMode: 'modal', boardVisibility: 'always' },
    { peekMode: 'modal', boardVisibility: 'peek' },
    { peekMode: 'modal', boardVisibility: 'never' },
    { peekMode: 'inline', boardVisibility: 'always' },
    { peekMode: 'inline', boardVisibility: 'peek' },
    { peekMode: 'inline', boardVisibility: 'never' },
  ] as const)('round-trips all six hint combinations via document.cookie', (hint) => {
    writePeekPreferenceCookie(hint);
    const entry = readCookieEntry();
    expect(entry).toBe(`${PEEK_COOKIE_NAME}=${encodePeekCookie(hint)}`);
  });

  it('exports PEEK_COOKIE_MAX_AGE_SEC as 1 year (symmetry with move-input cookie)', () => {
    expect(PEEK_COOKIE_MAX_AGE_SEC).toBe(60 * 60 * 24 * 365);
  });

  it('overwrites a previous cookie value on re-write', () => {
    writePeekPreferenceCookie({ peekMode: 'modal', boardVisibility: 'peek' });
    expect(readCookieEntry()).toBe(`${PEEK_COOKIE_NAME}=modal|peek`);

    writePeekPreferenceCookie({ peekMode: 'inline', boardVisibility: 'never' });
    expect(readCookieEntry()).toBe(`${PEEK_COOKIE_NAME}=inline|never`);
  });
});
