import { describe, expect, it } from 'vitest';

import { parseChesscomEmboardUrl, parseLichessEmbedUrl } from './parse-embed-url';

describe('parseChesscomEmboardUrl', () => {
  // #1 — happy path
  it('accepts https://www.chess.com/emboard?id=12345', () => {
    const r = parseChesscomEmboardUrl('https://www.chess.com/emboard?id=12345');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ provider: 'chesscom', embedId: '12345' });
    }
  });

  // #2 — non-https rejected
  it('rejects http:// (must be https)', () => {
    const r = parseChesscomEmboardUrl('http://www.chess.com/emboard?id=12345');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('wrong_protocol');
    }
  });

  // #3 — javascript: rejected
  it('rejects javascript:alert(1) (non-URL or wrong protocol)', () => {
    const r = parseChesscomEmboardUrl('javascript:alert(1)');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(['invalid_url', 'wrong_protocol']).toContain(r.reason);
    }
  });

  // #4 — apex rejected
  it('rejects bare apex chess.com (must be www.chess.com)', () => {
    const r = parseChesscomEmboardUrl('https://chess.com/emboard?id=12345');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('wrong_host');
    }
  });

  // #5 — subdomain rejected
  it('rejects mobile subdomain m.chess.com', () => {
    const r = parseChesscomEmboardUrl('https://m.chess.com/emboard?id=12345');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('wrong_host');
    }
  });

  // #6 — suffix attack rejected
  it('rejects suffix-lookalike www.chess.com.evil.tld', () => {
    const r = parseChesscomEmboardUrl('https://www.chess.com.evil.tld/emboard?id=12345');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('wrong_host');
    }
  });

  // #7 — path-as-host rejected
  it('rejects path-as-host evil.tld/www.chess.com/emboard', () => {
    const r = parseChesscomEmboardUrl('https://evil.tld/www.chess.com/emboard?id=12345');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('wrong_host');
    }
  });

  // #8 — userinfo with password rejected
  it('rejects user:pass@www.chess.com (userinfo present)', () => {
    const r = parseChesscomEmboardUrl('https://user:pass@www.chess.com/emboard?id=12345');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('has_userinfo');
    }
  });

  // #9 — userinfo prefix trick rejected
  it('rejects userinfo-prefix trick https://www.chess.com@evil.tld/emboard', () => {
    const r = parseChesscomEmboardUrl('https://www.chess.com@evil.tld/emboard?id=12345');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // Both has_userinfo and wrong_host reject it. has_userinfo fires
      // first in our parser.
      expect(['has_userinfo', 'wrong_host']).toContain(r.reason);
    }
  });

  // #10 — path extra rejected
  it('rejects /emboard/extra (trailing path)', () => {
    const r = parseChesscomEmboardUrl('https://www.chess.com/emboard/extra?id=12345');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #11 — empty id rejected
  it('rejects empty id (?id=)', () => {
    const r = parseChesscomEmboardUrl('https://www.chess.com/emboard?id=');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_id');
    }
  });

  // #12 — non-numeric id rejected
  it('rejects non-numeric id (?id=abc)', () => {
    const r = parseChesscomEmboardUrl('https://www.chess.com/emboard?id=abc');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_id');
    }
  });

  // #13 — path traversal id rejected
  it('rejects path traversal id (?id=../../../etc/passwd)', () => {
    const r = parseChesscomEmboardUrl('https://www.chess.com/emboard?id=../../../etc/passwd');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_id');
    }
  });

  // #14 — extra params tolerated
  it('accepts extra query params alongside a valid id', () => {
    const r = parseChesscomEmboardUrl('https://www.chess.com/emboard?id=12345&extra=foo');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.embedId).toBe('12345');
    }
  });

  // #15 — over-long input rejected
  it('rejects an input longer than 512 chars', () => {
    const padding = 'a'.repeat(600);
    const r = parseChesscomEmboardUrl(`https://www.chess.com/emboard?id=12345&pad=${padding}`);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('input_too_long');
    }
  });

  // #16 — IDN punycode rejected
  it('rejects IDN/punycode lookalike xn--chss-3qa.com', () => {
    const r = parseChesscomEmboardUrl('https://xn--chss-3qa.com/emboard?id=12345');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('wrong_host');
    }
  });

  // #17 — trim convention (WHATWG URL parser trims surrounding whitespace)
  it('accepts an input with surrounding ASCII whitespace (URL parser trims it)', () => {
    // The TSDoc says callers should trim; the WHATWG URL parser also
    // trims leading/trailing ASCII whitespace before parsing. Pin that
    // belt-and-braces behavior so a future swap from `new URL()` to a
    // hand-rolled parser does not silently start rejecting valid pastes.
    const r = parseChesscomEmboardUrl('   https://www.chess.com/emboard?id=12345   ');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.embedId).toBe('12345');
    }
  });
});

describe('parseLichessEmbedUrl', () => {
  // #18 — happy path
  it('accepts https://lichess.org/embed/abcd1234', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/abcd1234');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ provider: 'lichess', embedId: 'abcd1234' });
    }
  });

  // #19 — query params tolerated
  it('accepts trailing query string ?theme=dark', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/abcd1234?theme=dark');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.embedId).toBe('abcd1234');
    }
  });

  // #20 — non-https rejected
  it('rejects http:// (must be https)', () => {
    const r = parseLichessEmbedUrl('http://lichess.org/embed/abcd1234');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('wrong_protocol');
    }
  });

  // #21 — study chapter rejected
  it('rejects /study/{id}/{ch} (study chapter URLs are out of scope)', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/study/xxxxxxxx/yyyyyyyy');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #22 — trailing path rejected
  it('rejects trailing path /embed/abcd1234/extra', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/abcd1234/extra');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #23 — short id rejected
  it('rejects 7-char id (must be exactly 8 chars)', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/abcd123');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #24 — long id rejected
  it('rejects 9-char id (must be exactly 8 chars)', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/abcd12345');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #25 — hyphen in id rejected
  it('rejects id with hyphen abcd-234 (alnum only)', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/abcd-234');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #26 — subdomain rejected
  it('rejects www.lichess.org subdomain', () => {
    const r = parseLichessEmbedUrl('https://www.lichess.org/embed/abcd1234');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('wrong_host');
    }
  });

  // #27 — suffix attack rejected
  it('rejects suffix-lookalike lichess.org.attacker.com', () => {
    const r = parseLichessEmbedUrl('https://lichess.org.attacker.com/embed/abcd1234');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('wrong_host');
    }
  });

  // #28 — missing id rejected
  it('rejects /embed/ (missing id)', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #29 — fragment rejected
  it('rejects URL fragment /embed/abcd1234#evil', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/abcd1234#evil');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('fragment_not_allowed');
    }
  });

  // Phase 13 (#83): Lichess Share → Embed currently emits the
  // `/embed/game/{id}` shape. Both this and the older `/embed/{id}`
  // shape resolve to the same canonical 8-char gameId, so the parser
  // accepts both and downstream auto-fetch normalizes the rest.

  // #30 — Phase 13: /embed/game/{id} accepted
  it('accepts https://lichess.org/embed/game/0zeJx5nI (Share→Embed shape)', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/game/0zeJx5nI');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ provider: 'lichess', embedId: '0zeJx5nI' });
    }
  });

  // #31 — Phase 13: /embed/game/{id} with query string accepted
  it('accepts /embed/game/{id}?theme=dark', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/game/abcd1234?theme=dark');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.embedId).toBe('abcd1234');
    }
  });

  // #32 — Phase 13: /embed/game/{7-char} rejected
  it('rejects /embed/game/{7-char id}', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/game/abcd123');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #33 — Phase 13: /embed/game/{9-char} rejected
  it('rejects /embed/game/{9-char id}', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/game/abcd12345');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #34 — Phase 13: trailing path after /embed/game/{id} rejected
  it('rejects /embed/game/abcd1234/extra trailing path', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/game/abcd1234/extra');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #35 — Phase 13: /embed/game/ (no id) rejected
  it('rejects /embed/game/ with no id', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/game/');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #36 — Phase 13: nested /embed/game/game/{id} rejected
  it('rejects nested /embed/game/game/abcd1234', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/game/game/abcd1234');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });

  // #37 — Phase 13: hyphen in /embed/game/{id} rejected (alnum only)
  it('rejects /embed/game/abcd-234', () => {
    const r = parseLichessEmbedUrl('https://lichess.org/embed/game/abcd-234');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_path');
    }
  });
});
