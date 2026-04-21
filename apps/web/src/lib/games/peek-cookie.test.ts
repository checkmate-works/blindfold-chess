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
  it('encodes { peekMode: "modal",  showBoardButtonInGame: true  } as "modal|1"', () => {
    expect(encodePeekCookie({ peekMode: 'modal', showBoardButtonInGame: true })).toBe('modal|1');
  });

  it('encodes { peekMode: "modal",  showBoardButtonInGame: false } as "modal|0"', () => {
    expect(encodePeekCookie({ peekMode: 'modal', showBoardButtonInGame: false })).toBe('modal|0');
  });

  it('encodes { peekMode: "inline", showBoardButtonInGame: true  } as "inline|1"', () => {
    expect(encodePeekCookie({ peekMode: 'inline', showBoardButtonInGame: true })).toBe('inline|1');
  });

  it('encodes { peekMode: "inline", showBoardButtonInGame: false } as "inline|0"', () => {
    expect(encodePeekCookie({ peekMode: 'inline', showBoardButtonInGame: false })).toBe('inline|0');
  });
});

describe('parsePeekCookie', () => {
  describe('valid inputs', () => {
    it('parses "modal|1" as { peekMode: "modal",  showBoardButtonInGame: true }', () => {
      expect(parsePeekCookie('modal|1')).toEqual({
        peekMode: 'modal',
        showBoardButtonInGame: true,
      });
    });

    it('parses "modal|0" as { peekMode: "modal",  showBoardButtonInGame: false }', () => {
      expect(parsePeekCookie('modal|0')).toEqual({
        peekMode: 'modal',
        showBoardButtonInGame: false,
      });
    });

    it('parses "inline|1" as { peekMode: "inline", showBoardButtonInGame: true }', () => {
      expect(parsePeekCookie('inline|1')).toEqual({
        peekMode: 'inline',
        showBoardButtonInGame: true,
      });
    });

    it('parses "inline|0" as { peekMode: "inline", showBoardButtonInGame: false }', () => {
      expect(parsePeekCookie('inline|0')).toEqual({
        peekMode: 'inline',
        showBoardButtonInGame: false,
      });
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
    it('returns the default hint when the mode token is unknown ("bogus|1")', () => {
      expect(parsePeekCookie('bogus|1')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('is case-sensitive: uppercased "MODAL|1" is rejected as unknown', () => {
      // Mode names are a closed set of lowercase literals. Accepting uppercased
      // variants would widen the contract and risks coercing typos silently.
      expect(parsePeekCookie('MODAL|1')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('is case-sensitive: mixed-case "Modal|1" is rejected as unknown', () => {
      expect(parsePeekCookie('Modal|1')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('is case-sensitive: uppercased "INLINE|0" is rejected as unknown', () => {
      expect(parsePeekCookie('INLINE|0')).toEqual(DEFAULT_PEEK_HINT);
    });
  });

  describe('malformed boolean tokens', () => {
    it('returns the default hint for "modal|yes"', () => {
      expect(parsePeekCookie('modal|yes')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint for "modal|true" (only "1" / "0" are accepted)', () => {
      // `true`/`false` would be ambiguous with other truthy tokens; the parser
      // intentionally accepts only the exact canonical tokens emitted by the
      // encoder.
      expect(parsePeekCookie('modal|true')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint for "modal|false"', () => {
      expect(parsePeekCookie('modal|false')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint when the boolean token is empty ("modal|")', () => {
      // Trailing pipe with no tail — the boolean slot is effectively missing,
      // which is malformed (unlike the move-input cookie where an empty tail
      // is a valid "no enabled list" signal).
      expect(parsePeekCookie('modal|')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint when the pipe is missing entirely ("modal")', () => {
      // No pipe means no boolean slot at all — malformed.
      expect(parsePeekCookie('modal')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint for numeric-looking but non-canonical tokens ("modal|2")', () => {
      expect(parsePeekCookie('modal|2')).toEqual(DEFAULT_PEEK_HINT);
    });
  });

  describe('separator anomalies', () => {
    it('returns the default hint when there are consecutive pipes ("modal||1")', () => {
      // First split yields ['modal', ''] — the boolean slot is '' which is
      // neither '1' nor '0', so the parser falls back to the default hint.
      expect(parsePeekCookie('modal||1')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint for only-pipes input ("||")', () => {
      expect(parsePeekCookie('||')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('returns the default hint when there is extra trailing content ("modal|1|extra")', () => {
      // `split('|')` yields ['modal', '1', 'extra']; the parser only reads the
      // first two segments, so the boolean slot is '1' and parsing succeeds.
      // However, accepting extra trailing content would widen the contract in
      // a way the encoder never emits — guard this as the current behavior
      // (the parser happens to accept it because it uses destructuring) and
      // document the observed output.
      //
      // Observed behavior: the current parser permissively keeps the first
      // two segments, so 'modal|1|extra' parses as { peekMode: 'modal',
      // showBoardButtonInGame: true }. This test pins that behavior so any
      // future tightening is an intentional, reviewable change.
      expect(parsePeekCookie('modal|1|extra')).toEqual({
        peekMode: 'modal',
        showBoardButtonInGame: true,
      });
    });
  });

  describe('whitespace handling', () => {
    // Note: the move-input cookie parser trims whitespace inside the enabled-mode
    // list, but peek-cookie has no list — only two scalar slots separated by a
    // single pipe. The parser does NOT trim either slot, so whitespace-containing
    // inputs are treated as malformed.
    //
    // This is intentional and consistent with move-input: neither parser trims
    // the peekMode / mode slot itself (it only trims enabled-mode list entries).
    it('does NOT trim trailing whitespace in the boolean slot ("modal|1 ")', () => {
      expect(parsePeekCookie('modal|1 ')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('does NOT trim leading whitespace in the peekMode slot (" modal|1")', () => {
      expect(parsePeekCookie(' modal|1')).toEqual(DEFAULT_PEEK_HINT);
    });

    it('does NOT accept internal whitespace around the pipe ("modal | 1")', () => {
      // "modal " is not a known peek mode, so this falls back.
      expect(parsePeekCookie('modal | 1')).toEqual(DEFAULT_PEEK_HINT);
    });
  });

  describe('boundary / untrusted input', () => {
    it('tolerates very long untrusted input (>1000 chars) without throwing', () => {
      // Must not DoS or crash the parser. Output must remain a valid hint.
      const longGarbage = 'x'.repeat(10_000);
      const result = parsePeekCookie(longGarbage);
      expect(result).toEqual(DEFAULT_PEEK_HINT);
    });

    it('tolerates a very long trailing boolean slot without throwing', () => {
      const longBool = `modal|${'1'.repeat(10_000)}`;
      const result = parsePeekCookie(longBool);
      // '11111...' is not the canonical '1', so it's malformed → default.
      expect(result).toEqual(DEFAULT_PEEK_HINT);
    });
  });
});

describe('parse ↔ encode round-trip', () => {
  const cases: PeekPreferenceHint[] = [
    { peekMode: 'modal', showBoardButtonInGame: true },
    { peekMode: 'modal', showBoardButtonInGame: false },
    { peekMode: 'inline', showBoardButtonInGame: true },
    { peekMode: 'inline', showBoardButtonInGame: false },
  ];

  it.each(cases)('parse(encode($peekMode|$showBoardButtonInGame)) === input', (hint) => {
    expect(parsePeekCookie(encodePeekCookie(hint))).toEqual(hint);
  });

  it('is idempotent when applied twice (parse∘encode∘parse∘encode)', () => {
    const hint: PeekPreferenceHint = { peekMode: 'inline', showBoardButtonInGame: false };
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
    // jsdom's `document.cookie` returns all cookies joined by `; ` with no
    // attributes — so matching by prefix is enough.
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
    writePeekPreferenceCookie({ peekMode: 'modal', showBoardButtonInGame: true });
    const entry = readCookieEntry();
    expect(entry).not.toBeNull();
    expect(entry!.startsWith(`${PEEK_COOKIE_NAME}=`)).toBe(true);
  });

  it('writes the encoded value after the "=" sign', () => {
    const hint: PeekPreferenceHint = { peekMode: 'inline', showBoardButtonInGame: false };
    writePeekPreferenceCookie(hint);
    const entry = readCookieEntry();
    expect(entry).toBe(`${PEEK_COOKIE_NAME}=${encodePeekCookie(hint)}`);
  });

  it.each([
    { peekMode: 'modal', showBoardButtonInGame: true },
    { peekMode: 'modal', showBoardButtonInGame: false },
    { peekMode: 'inline', showBoardButtonInGame: true },
    { peekMode: 'inline', showBoardButtonInGame: false },
  ] as const)('round-trips all four hint combinations via document.cookie', (hint) => {
    writePeekPreferenceCookie(hint);
    const entry = readCookieEntry();
    expect(entry).toBe(`${PEEK_COOKIE_NAME}=${encodePeekCookie(hint)}`);
  });

  it('exports PEEK_COOKIE_MAX_AGE_SEC as 1 year (symmetry with move-input cookie)', () => {
    // The cookie's Max-Age is not visible on jsdom's `document.cookie`
    // accessor (it strips attributes), so we pin the exported constant used
    // by the writer. Keep this in sync with MOVE_INPUT_COOKIE_MAX_AGE_SEC.
    expect(PEEK_COOKIE_MAX_AGE_SEC).toBe(60 * 60 * 24 * 365);
  });

  it('overwrites a previous cookie value on re-write', () => {
    writePeekPreferenceCookie({ peekMode: 'modal', showBoardButtonInGame: true });
    expect(readCookieEntry()).toBe(`${PEEK_COOKIE_NAME}=modal|1`);

    writePeekPreferenceCookie({ peekMode: 'inline', showBoardButtonInGame: false });
    expect(readCookieEntry()).toBe(`${PEEK_COOKIE_NAME}=inline|0`);
  });
});
