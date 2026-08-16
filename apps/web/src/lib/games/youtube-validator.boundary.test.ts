import { describe, expect, expectTypeOf, it } from 'vitest';

import type { ParseYouTubeUrlResult, YouTubeUrlReason } from './youtube-validator';
import { YOUTUBE_VIDEO_ID_RE, parseYouTubeUrl } from './youtube-validator';

/**
 * Boundary pins for `parseYouTubeUrl` and the shared
 * id regex.
 *
 * The Coder suite covers the SE 28 hostile-input matrix. This file pins
 * the *boundary* rows that are easy to regress in a refactor:
 *
 *   - URL length cap (511 / 512 / 513) on either side of MAX_INPUT_LENGTH
 *   - 11-char id alphabet boundary at every accepted character
 *   - 10 / 12 char id strict reject on each shape (`/watch?v=`, `youtu.be`,
 *     `/shorts/`, `/live/`, `/embed/`, `youtube-nocookie`)
 *   - empty / whitespace-only / pure-pathname / scheme-only inputs (step 2)
 *   - id-with-trailing-`+`/`=`/`/` chars (regex character-class boundary)
 *
 * These are intentionally separate from the Coder suite so they can be
 * read as a dedicated boundary table.
 */

const VALID_ID = 'VALIDID0001';

describe('parseYouTubeUrl — input length boundary (511 / 512 / 513)', () => {
  // The cap is `input.length > MAX_INPUT_LENGTH` where MAX = 512. So:
  //   - length 512  → must be accepted (boundary inclusive)
  //   - length 513  → must be rejected (boundary exclusive)
  //   - length 511  → must be accepted (one below boundary)

  function buildUrlOfLength(target: number): string {
    const prefix = `https://www.youtube.com/watch?v=${VALID_ID}&pad=`;
    const padding = 'a'.repeat(target - prefix.length);
    const url = prefix + padding;
    if (url.length !== target) {
      throw new Error(`builder bug: expected ${target}, got ${url.length}`);
    }
    return url;
  }

  it('accepts an input of exactly 511 chars', () => {
    const url = buildUrlOfLength(511);
    const r = parseYouTubeUrl(url);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.providerVideoId).toBe(VALID_ID);
  });

  it('accepts an input of exactly 512 chars (boundary inclusive)', () => {
    const url = buildUrlOfLength(512);
    const r = parseYouTubeUrl(url);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.providerVideoId).toBe(VALID_ID);
  });

  it('rejects an input of exactly 513 chars with input_too_long (boundary exclusive)', () => {
    const url = buildUrlOfLength(513);
    const r = parseYouTubeUrl(url);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('input_too_long');
  });
});

describe('parseYouTubeUrl — id alphabet boundary (11-char regex character class)', () => {
  // The regex `^[A-Za-z0-9_-]{11}$` accepts URL-safe base64. Pin every
  // boundary character of the class so a future tightening (e.g. dropping
  // `_` or `-`) is caught by a failing test, not by a UX bug.

  const BOUNDARY_IDS_ACCEPTED: ReadonlyArray<readonly [string, string]> = [
    // [label, id]
    ['all underscores', '___________'],
    ['all hyphens', '-----------'],
    ['all uppercase A', 'AAAAAAAAAAA'],
    ['all uppercase Z', 'ZZZZZZZZZZZ'],
    ['all lowercase a', 'aaaaaaaaaaa'],
    ['all lowercase z', 'zzzzzzzzzzz'],
    ['all digits 0', '00000000000'],
    ['all digits 9', '99999999999'],
    // alternation patterns hitting both `_` and `-`
    ['_-_-_-_-_-_', '_-_-_-_-_-_'],
    ['mixed boundary 0/9/_/-', '09_-09_-09_'],
    ['mixed alpha boundary A/Z/a/z', 'AZazAZazAZa'],
  ];

  for (const [label, id] of BOUNDARY_IDS_ACCEPTED) {
    it(`accepts boundary id (${label}) via /watch?v=`, () => {
      const r = parseYouTubeUrl(`https://www.youtube.com/watch?v=${id}`);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.providerVideoId).toBe(id);
    });

    it(`accepts boundary id (${label}) via youtu.be/{id}`, () => {
      const r = parseYouTubeUrl(`https://youtu.be/${id}`);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.providerVideoId).toBe(id);
    });

    it(`accepts boundary id (${label}) via /shorts/`, () => {
      const r = parseYouTubeUrl(`https://www.youtube.com/shorts/${id}`);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.providerVideoId).toBe(id);
    });

    it(`accepts boundary id (${label}) via /embed/ on nocookie host`, () => {
      const r = parseYouTubeUrl(`https://www.youtube-nocookie.com/embed/${id}`);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.providerVideoId).toBe(id);
    });
  }

  // Out-of-class characters at every position of the id should reject.
  // We sample a representative set: `+`, `=`, `/`, `.`, ` `, `?`, `#`.
  // Some of these (e.g. `/`, `?`, `#`, ` `) reshape the URL itself, so
  // we accept either `pathname_not_supported` / `param_pollution` /
  // `invalid_id` as the failure surface — what matters is `r.ok === false`
  // and that the failure is one of the URL-safety reasons (never `ok`).
  const OUT_OF_CLASS_CHARS = ['+', '=', '.', '!', '~'];

  for (const ch of OUT_OF_CLASS_CHARS) {
    it(`rejects an id containing the out-of-class char "${ch}" via /watch?v=`, () => {
      const id = `AAAAAAAAAA${ch}`; // 11 chars, last is out-of-class
      const r = parseYouTubeUrl(`https://www.youtube.com/watch?v=${id}`);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('invalid_id');
    });
  }
});

describe('parseYouTubeUrl — 10-char and 12-char id strict reject (every accepted shape)', () => {
  const TEN = 'AAAAAAAAAA'; // 10 chars
  const TWELVE = 'AAAAAAAAAAAA'; // 12 chars

  const SHAPES: ReadonlyArray<readonly [string, (id: string) => string]> = [
    ['/watch?v=', (id) => `https://www.youtube.com/watch?v=${id}`],
    ['youtu.be/{id}', (id) => `https://youtu.be/${id}`],
    ['/shorts/{id}', (id) => `https://www.youtube.com/shorts/${id}`],
    ['/live/{id}', (id) => `https://www.youtube.com/live/${id}`],
    ['/embed/{id}', (id) => `https://www.youtube.com/embed/${id}`],
    ['nocookie /embed/{id}', (id) => `https://www.youtube-nocookie.com/embed/${id}`],
  ];

  for (const [label, build] of SHAPES) {
    it(`rejects a 10-char id via ${label}`, () => {
      const r = parseYouTubeUrl(build(TEN));
      expect(r.ok).toBe(false);
      if (!r.ok) {
        // /watch?v= surfaces invalid_id (step 8). The path-anchored
        // shapes (/shorts/, /live/, /embed/, /youtu.be/) reject at the
        // pathname matcher because the regex requires exactly 11 chars,
        // surfacing pathname_not_supported. Either is acceptable as a
        // strict-reject witness — what matters is no `ok: true`.
        expect(['invalid_id', 'pathname_not_supported']).toContain(r.reason);
      }
    });

    it(`rejects a 12-char id via ${label}`, () => {
      const r = parseYouTubeUrl(build(TWELVE));
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(['invalid_id', 'pathname_not_supported']).toContain(r.reason);
      }
    });
  }
});

describe('parseYouTubeUrl — degenerate inputs (step 2 / step 3)', () => {
  it('rejects empty string with invalid_url (step 2 throws)', () => {
    const r = parseYouTubeUrl('');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_url');
  });

  it('rejects whitespace-only string with invalid_url (WHATWG strips, then empty)', () => {
    const r = parseYouTubeUrl('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_url');
  });

  it('rejects pure pathname (no scheme/host) with invalid_url', () => {
    const r = parseYouTubeUrl(`/watch?v=${VALID_ID}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_url');
  });

  it('rejects scheme-only `https://` (host empty) with invalid_url or host_not_allowed', () => {
    // `new URL('https://')` throws in current WHATWG implementations,
    // surfacing invalid_url. If a future engine relaxes this and produces
    // an empty hostname, host_not_allowed is the next-line defense — pin
    // both as acceptable surfaces so the test does not become flaky on
    // an engine update, while still catching any regression that lets
    // such an input parse OK.
    const r = parseYouTubeUrl('https://');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(['invalid_url', 'host_not_allowed']).toContain(r.reason);
  });

  it('rejects `https:///watch?v=...` (triple slash, host empty) without OK', () => {
    const r = parseYouTubeUrl(`https:///watch?v=${VALID_ID}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(['invalid_url', 'host_not_allowed']).toContain(r.reason);
  });

  it('rejects relative protocol `//www.youtube.com/...` without OK', () => {
    const r = parseYouTubeUrl(`//www.youtube.com/watch?v=${VALID_ID}`);
    expect(r.ok).toBe(false);
    // `//host/...` has no scheme; WHATWG rejects with TypeError →
    // invalid_url. If a future engine accepts and synthesizes a scheme,
    // the next defense is protocol_not_https.
    if (!r.ok) expect(['invalid_url', 'protocol_not_https']).toContain(r.reason);
  });
});

describe('parseYouTubeUrl — discriminated union narrowing (Lessons §13)', () => {
  // The result type is a tagged union — `r.ok` discriminates between
  // the success and failure variants. Pin that callers can narrow on
  // `r.ok` and the narrowed branches expose the right field shape.
  // This protects against a future refactor that flattens the union
  // (e.g. `{ ok: boolean; value?: ...; reason?: ... }`) which would
  // silently break every caller's `if (!r.ok)` early-return idiom.

  it('narrowing on r.ok === true exposes value with the YouTube triple', () => {
    const r = parseYouTubeUrl(`https://www.youtube.com/watch?v=${VALID_ID}`);
    if (r.ok) {
      // Compile-time pin: success branch has the value triple.
      expectTypeOf(r).toEqualTypeOf<{
        ok: true;
        value: {
          provider: 'youtube';
          providerVideoId: string;
          sourceUrl: string;
        };
      }>();
      expect(r.value.provider).toBe('youtube');
    } else {
      // Force failure if the parse did not succeed (the URL above is valid).
      throw new Error(`parser unexpectedly rejected with reason ${r.reason}`);
    }
  });

  it('narrowing on r.ok === false exposes reason and error', () => {
    const r = parseYouTubeUrl('not a url at all');
    if (!r.ok) {
      // Compile-time pin: failure branch has reason + error.
      expectTypeOf(r).toEqualTypeOf<{
        ok: false;
        reason: YouTubeUrlReason;
        error: string;
      }>();
      expect(r.reason).toBe('invalid_url');
      expect(typeof r.error).toBe('string');
    } else {
      throw new Error('parser unexpectedly accepted invalid input');
    }
  });

  it('the union type itself contains both variants', () => {
    expectTypeOf<ParseYouTubeUrlResult>().toMatchTypeOf<
      | { ok: true; value: { provider: 'youtube'; providerVideoId: string; sourceUrl: string } }
      | { ok: false; reason: YouTubeUrlReason; error: string }
    >();
  });
});

describe('YOUTUBE_VIDEO_ID_RE — character-class edge characters', () => {
  // The regex source is the contract; pin every URL-safe base64 boundary
  // character explicitly so a one-side tightening fails loudly.
  it('accepts the all-`_` id', () => {
    expect(YOUTUBE_VIDEO_ID_RE.test('___________')).toBe(true);
  });

  it('accepts the all-`-` id', () => {
    expect(YOUTUBE_VIDEO_ID_RE.test('-----------')).toBe(true);
  });

  it('accepts an id mixing `_`, `-`, `0`, `9`, `A`, `Z`, `a`, `z`', () => {
    expect(YOUTUBE_VIDEO_ID_RE.test('_-09AZazAZa')).toBe(true);
  });

  it('rejects `+` (standard base64 char, NOT in URL-safe alphabet)', () => {
    expect(YOUTUBE_VIDEO_ID_RE.test('AAAAAAAAAA+')).toBe(false);
  });

  it('rejects `/` (standard base64 char, NOT in URL-safe alphabet)', () => {
    expect(YOUTUBE_VIDEO_ID_RE.test('AAAAAAAAAA/')).toBe(false);
  });

  it('rejects `=` (base64 padding, NOT in URL-safe alphabet)', () => {
    expect(YOUTUBE_VIDEO_ID_RE.test('AAAAAAAAAA=')).toBe(false);
  });

  it('rejects a leading space', () => {
    expect(YOUTUBE_VIDEO_ID_RE.test(' AAAAAAAAAA')).toBe(false);
  });

  it('rejects a trailing space', () => {
    expect(YOUTUBE_VIDEO_ID_RE.test('AAAAAAAAAA ')).toBe(false);
  });

  it('rejects a tab embedded in the id', () => {
    expect(YOUTUBE_VIDEO_ID_RE.test('AAAAA\tAAAAA')).toBe(false);
  });
});
