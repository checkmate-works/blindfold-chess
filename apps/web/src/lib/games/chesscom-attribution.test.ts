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
});
