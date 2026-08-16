import { describe, expect, it } from 'vitest';

import { parseChesscomAttribution } from './chesscom-attribution';

describe('parseChesscomAttribution', () => {
  describe('happy paths', () => {
    it('accepts a canonical /game/live/<id> URL', () => {
      const result = parseChesscomAttribution('https://www.chess.com/game/live/12345');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({
          attributionPlatform: 'chesscom',
          attributionPath: '/game/live/12345',
        });
      }
    });

    it('accepts /game/<id> (computer game style)', () => {
      const result = parseChesscomAttribution('https://www.chess.com/game/123456789');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath).toBe('/game/123456789');
      }
    });

    it('accepts a member profile path', () => {
      const result = parseChesscomAttribution('https://www.chess.com/member/MagnusCarlsen');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath).toBe('/member/MagnusCarlsen');
      }
    });

    it('drops the query string (only persists pathname)', () => {
      const result = parseChesscomAttribution(
        'https://www.chess.com/game/live/12345?next=evil&utm_source=foo'
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath).toBe('/game/live/12345');
      }
    });

    it('drops the URL fragment (only persists pathname)', () => {
      const result = parseChesscomAttribution('https://www.chess.com/game/live/12345#move=10');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath).toBe('/game/live/12345');
      }
    });

    it('accepts paths with hyphens and underscores', () => {
      const result = parseChesscomAttribution('https://www.chess.com/club/some-club_name');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath).toBe('/club/some-club_name');
      }
    });
  });

  describe('protocol enforcement', () => {
    it('rejects http:// (must be https)', () => {
      const result = parseChesscomAttribution('http://www.chess.com/game/live/12345');
      expect(result).toEqual({ ok: false, reason: 'wrong_protocol' });
    });

    it('rejects javascript: URLs (parses but wrong protocol)', () => {
      // `javascript:alert(1)` parses as a URL with protocol 'javascript:'.
      // We treat the protocol check as the primary defense; the path
      // check would also reject it, but failing earlier is clearer.
      const result = parseChesscomAttribution('javascript:alert(1)');
      // Either invalid_url or wrong_protocol is acceptable — the
      // important part is that ok=false.
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(['invalid_url', 'wrong_protocol']).toContain(result.reason);
      }
    });

    it('rejects file:// URLs', () => {
      const result = parseChesscomAttribution('file:///etc/passwd');
      expect(result).toEqual({ ok: false, reason: 'wrong_protocol' });
    });
  });

  describe('userinfo trick', () => {
    it('rejects `https://www.chess.com@evil.tld/foo` (userinfo present)', () => {
      // Parses with hostname=evil.tld, username=www.chess.com. Both
      // the userinfo check and the hostname check would catch this;
      // the userinfo check is the more semantically precise one.
      const result = parseChesscomAttribution('https://www.chess.com@evil.tld/foo');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(['has_userinfo', 'wrong_host']).toContain(result.reason);
      }
    });

    it('rejects `https://user:pass@www.chess.com/foo` (password present)', () => {
      const result = parseChesscomAttribution('https://user:pass@www.chess.com/foo');
      expect(result).toEqual({ ok: false, reason: 'has_userinfo' });
    });
  });

  describe('hostname allow-list', () => {
    it('rejects bare apex (chess.com) — must be www.chess.com', () => {
      const result = parseChesscomAttribution('https://chess.com/game/live/12345');
      expect(result).toEqual({ ok: false, reason: 'wrong_host' });
    });

    it('rejects mobile subdomain (m.chess.com)', () => {
      const result = parseChesscomAttribution('https://m.chess.com/game/live/12345');
      expect(result).toEqual({ ok: false, reason: 'wrong_host' });
    });

    it('rejects api subdomain (api.chess.com)', () => {
      const result = parseChesscomAttribution('https://api.chess.com/pub/player/x');
      expect(result).toEqual({ ok: false, reason: 'wrong_host' });
    });

    it('rejects suffix-lookalike (www.chess.com.evil.tld)', () => {
      const result = parseChesscomAttribution('https://www.chess.com.evil.tld/game/live/12345');
      expect(result).toEqual({ ok: false, reason: 'wrong_host' });
    });

    it('rejects punycode lookalike (xn--chss-3qa.com)', () => {
      const result = parseChesscomAttribution('https://xn--chss-3qa.com/game/live/1');
      expect(result).toEqual({ ok: false, reason: 'wrong_host' });
    });

    it('rejects unicode IDN that the URL parser converts to a non-canonical hostname', () => {
      // URL parser normalizes IDN; whatever it produces must still not
      // equal 'www.chess.com' and so must be rejected.
      const result = parseChesscomAttribution('https://www.chéss.com/game/live/1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('wrong_host');
      }
    });
  });

  describe('path validation', () => {
    it('rejects empty path (just the hostname)', () => {
      // `new URL('https://www.chess.com')` has pathname '/', which the
      // regex {1,128} requires at least one char AFTER the leading `/`.
      const result = parseChesscomAttribution('https://www.chess.com');
      expect(result).toEqual({ ok: false, reason: 'invalid_path' });
    });

    it('rejects root-only path `/`', () => {
      const result = parseChesscomAttribution('https://www.chess.com/');
      expect(result).toEqual({ ok: false, reason: 'invalid_path' });
    });

    it('rejects path with disallowed characters (dots in the segment)', () => {
      const result = parseChesscomAttribution('https://www.chess.com/foo.bar');
      expect(result).toEqual({ ok: false, reason: 'invalid_path' });
    });

    it('rejects path with parens', () => {
      const result = parseChesscomAttribution('https://www.chess.com/foo(bar)');
      expect(result).toEqual({ ok: false, reason: 'invalid_path' });
    });

    it('rejects an over-long path (200+ chars)', () => {
      const longSegment = 'a'.repeat(200);
      const result = parseChesscomAttribution(`https://www.chess.com/${longSegment}`);
      expect(result).toEqual({ ok: false, reason: 'invalid_path' });
    });

    it('accepts a path at the 128-char boundary', () => {
      // 1 char for the leading `/` is part of the regex, so the
      // regex {1,128} allows up to 128 chars after the slash.
      const segment = 'x'.repeat(128);
      const result = parseChesscomAttribution(`https://www.chess.com/${segment}`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath.length).toBe(129); // 1 + 128
      }
    });
  });

  describe('malformed input', () => {
    it('rejects empty string as invalid_url', () => {
      const result = parseChesscomAttribution('');
      expect(result).toEqual({ ok: false, reason: 'invalid_url' });
    });

    it('rejects garbage as invalid_url', () => {
      const result = parseChesscomAttribution('not a url');
      expect(result).toEqual({ ok: false, reason: 'invalid_url' });
    });

    it('rejects a relative URL', () => {
      const result = parseChesscomAttribution('/game/live/12345');
      expect(result).toEqual({ ok: false, reason: 'invalid_url' });
    });
  });

  // ─── WHATWG URL parser quirks pinned as regressions ───
  //
  // `parseChesscomAttribution` outsources protocol / hostname / pathname
  // extraction to `new URL(...)`. The parser performs several silent
  // normalizations (lowercasing the hostname, stripping surrounding
  // ASCII whitespace from the input, collapsing `/foo/../bar` to `/bar`,
  // dropping empty query / fragment markers). These are observable
  // through the parser's outputs so they affect what passes the
  // hostname allow-list and the path regex. The tests below pin the
  // behaviors a security review would want documented — if a future
  // Node release (or a swap to a different URL parser) ever changed
  // them, the contract here would surface in CI rather than silently
  // tighten or loosen the validator.
  describe('WHATWG URL parser quirks', () => {
    it('accepts an UPPERCASE hostname (URL parser lowercases hostnames)', () => {
      // `WWW.CHESS.COM` -> `www.chess.com`. The `===` host check is
      // therefore case-insensitive in practice. Pin so a future move
      // away from `new URL()` (e.g. a hand-rolled parser) does not
      // silently start rejecting a valid uppercase paste.
      const result = parseChesscomAttribution('https://WWW.CHESS.COM/game/live/1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath).toBe('/game/live/1');
      }
    });

    it('accepts an input wrapped in surrounding ASCII whitespace (URL parser trims it)', () => {
      // The TSDoc says "input should already be trimmed by the
      // caller", but the WHATWG URL parser also trims leading /
      // trailing ASCII whitespace before parsing. Pin that
      // belt-and-braces behavior — no caller has to remember.
      const result = parseChesscomAttribution('   https://www.chess.com/game/live/1   ');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath).toBe('/game/live/1');
      }
    });

    it('accepts a trailing empty `?` (URL parser yields empty search and pathname `/foo`)', () => {
      const result = parseChesscomAttribution('https://www.chess.com/game/live/1?');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath).toBe('/game/live/1');
      }
    });

    it('accepts a trailing empty `#` (URL parser yields empty hash and pathname `/foo`)', () => {
      const result = parseChesscomAttribution('https://www.chess.com/game/live/1#');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath).toBe('/game/live/1');
      }
    });

    it('accepts `//foo` (consecutive slashes survive into pathname; allowed by the regex)', () => {
      // The path regex `^/[A-Za-z0-9/_-]{1,128}$` allows `/` inside the
      // body, so `https://www.chess.com//foo` -> pathname `//foo`
      // passes. Documented here so a future tightening (e.g. require a
      // single leading slash) is a deliberate choice with a failing
      // test, not a silent change.
      const result = parseChesscomAttribution('https://www.chess.com//foo');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath).toBe('//foo');
      }
    });

    it('accepts a path with `/foo/../bar` (parser normalizes to `/bar` before regex sees it)', () => {
      // Path traversal segments are folded by the URL parser so the
      // regex never sees a `.` character. Pinning this guards against
      // a future custom parser that forwards `/foo/../bar` verbatim,
      // which would then fail the regex (the dot is not in the allow
      // list) and silently start rejecting valid pastes.
      const result = parseChesscomAttribution('https://www.chess.com/foo/../bar');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.attributionPath).toBe('/bar');
      }
    });

    it('rejects a path containing a literal space (URL parser percent-encodes it; `%` fails the regex)', () => {
      // `https://www.chess.com/foo bar` -> pathname `/foo%20bar`. The
      // `%` character is NOT in the path regex allow-list, so the
      // result is reject-with-`invalid_path`. This is the right outcome
      // (we do not want pasted display text with spaces) but the
      // failure mode is two steps removed from the literal input —
      // pinning it makes the chain explicit.
      const result = parseChesscomAttribution('https://www.chess.com/foo bar');
      expect(result).toEqual({ ok: false, reason: 'invalid_path' });
    });

    it('rejects a path containing a stray invisible char (parser percent-encodes it; `%` fails the regex)', () => {
      // U+200B inside the path is percent-encoded by the URL parser
      // into `%E2%80%8B`. The path regex disallows `%`, so the row is
      // rejected — i.e. invisible characters in the path cannot smuggle
      // past the validator even though they survive the URL parse.
      const sneaky = `https://www.chess.com/foo${String.fromCharCode(0x200b)}`;
      const result = parseChesscomAttribution(sneaky);
      expect(result).toEqual({ ok: false, reason: 'invalid_path' });
    });
  });

  describe('path length boundary (one above the regex cap)', () => {
    it('rejects a path one character ABOVE the 128-char cap (regression on `{1,128}`)', () => {
      // The boundary value test in the happy-path block pins 128
      // chars after the leading slash as the upper edge. This
      // companion test pins 129 chars as the smallest reject — a
      // future regex tweak from `{1,128}` to `{1,160}` (the column is
      // 160 chars wide) would be a deliberate widening with a
      // failing test, not a silent change.
      const segment = 'x'.repeat(129);
      const result = parseChesscomAttribution(`https://www.chess.com/${segment}`);
      expect(result).toEqual({ ok: false, reason: 'invalid_path' });
    });
  });
});
