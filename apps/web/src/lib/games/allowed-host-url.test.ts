import { describe, expect, it } from 'vitest';

import { parseAllowedHostUrl } from './allowed-host-url';

const HOST = 'www.chess.com';

describe('parseAllowedHostUrl', () => {
  it('accepts an https URL on the exact hostname', () => {
    const result = parseAllowedHostUrl('https://www.chess.com/emboard?id=1', { hostname: HOST });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url.pathname).toBe('/emboard');
    }
  });

  it('rejects input longer than maxLength before parsing', () => {
    const result = parseAllowedHostUrl(`https://www.chess.com/${'a'.repeat(600)}`, {
      hostname: HOST,
      maxLength: 512,
    });
    expect(result).toEqual({ ok: false, reason: 'input_too_long' });
  });

  it('skips the length check entirely when maxLength is omitted', () => {
    const result = parseAllowedHostUrl(`https://www.chess.com/${'a'.repeat(600)}`, {
      hostname: HOST,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects an unparseable URL', () => {
    expect(parseAllowedHostUrl('not a url', { hostname: HOST })).toEqual({
      ok: false,
      reason: 'invalid_url',
    });
  });

  it('rejects a non-https protocol', () => {
    expect(parseAllowedHostUrl('http://www.chess.com/game/1', { hostname: HOST })).toEqual({
      ok: false,
      reason: 'wrong_protocol',
    });
  });

  it('rejects embedded credentials', () => {
    expect(parseAllowedHostUrl('https://user:pw@www.chess.com/game/1', { hostname: HOST })).toEqual(
      { ok: false, reason: 'has_userinfo' }
    );
  });

  it.each([
    ['bare apex', 'https://chess.com/game/1'],
    ['subdomain', 'https://m.chess.com/game/1'],
    ['suffix lookalike', 'https://www.chess.com.evil.tld/game/1'],
    ['punycode homograph', 'https://xn--chss-3qa.com/game/1'],
    ['userinfo-prefix trick', 'https://www.chess.com@evil.tld/game/1'],
  ])('rejects %s as wrong_host or has_userinfo', (_label, input) => {
    const result = parseAllowedHostUrl(input, { hostname: HOST });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(['wrong_host', 'has_userinfo']).toContain(result.reason);
    }
  });
});
