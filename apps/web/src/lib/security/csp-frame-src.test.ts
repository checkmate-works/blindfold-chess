import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Phase B Tester suite — D8 #43 / #44.
 *
 * SecurityEngineer Phase 1 baseline (D2) requires the CSP `frame-src`
 * directive to:
 *   - allow `www.chess.com` and `lichess.org` (Phase B embed origins)
 *   - NOT use `*` or `https:` schema-only tokens (regression guard
 *     against accidental over-broadening)
 *
 * The CSP today is configured statically in `next.config.ts` via the
 * `cspDirectives` array, so a static-text assertion against that file
 * is the cheapest and most reliable check. A runtime header inspection
 * would require booting Next, which is out of proportion for what is
 * effectively a literal in source.
 *
 * If `next.config.ts` ever moves the CSP into a dynamic loader / env
 * lookup, the static-text approach must be replaced with a header
 * integration test — flag this with a comment update at that time.
 */

async function readNextConfigSource(): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // apps/web/src/lib/security → apps/web (3 levels up).
  const configPath = path.resolve(here, '..', '..', '..', 'next.config.ts');
  return readFile(configPath, 'utf8');
}

function extractFrameSrcDirective(source: string): string {
  // The directive is a single line of the form
  //   'frame-src googleads.g.doubleclick.net ... www.chess.com lichess.org',
  // Single OR double quoted, with the directive name `frame-src` first.
  // We extract the entire string literal that contains `frame-src`.
  const match = source.match(/['"]\s*frame-src\b[^'"\n]*['"]/);
  if (!match) {
    throw new Error('frame-src directive not found in next.config.ts source');
  }
  return match[0];
}

describe('CSP frame-src — Phase B Tester #43 / #44', () => {
  // #43 — frame-src includes both chess.com and lichess.org
  it('#43 next.config.ts CSP frame-src directive contains both www.chess.com and lichess.org', async () => {
    const source = await readNextConfigSource();
    const directive = extractFrameSrcDirective(source);
    // Both Phase B embed origins must be in the allow-list.
    expect(directive).toContain('www.chess.com');
    expect(directive).toContain('lichess.org');
  });

  // #75 — frame-src includes www.youtube-nocookie.com (issue #75 video
  // attachments). The renderer always rebuilds the iframe src to use
  // the privacy-enhanced nocookie host, so the standard youtube.com
  // origin is intentionally NOT in the allow-list — adding it would
  // expand the attack surface for cookies/tracking without enabling
  // any user flow.
  it('#75 next.config.ts CSP frame-src directive contains www.youtube-nocookie.com', async () => {
    const source = await readNextConfigSource();
    const directive = extractFrameSrcDirective(source);
    expect(directive).toContain('www.youtube-nocookie.com');
  });

  it('#75 next.config.ts CSP frame-src directive does NOT include the standard www.youtube.com host', async () => {
    const source = await readNextConfigSource();
    const directive = extractFrameSrcDirective(source);
    // The renderer is pinned to nocookie. If www.youtube.com ever
    // appears in this directive, it should be a deliberate decision
    // documented in the same change.
    const tokens = directive.replace(/^['"]/, '').replace(/['"]$/, '').trim().split(/\s+/).slice(1);
    expect(tokens).not.toContain('www.youtube.com');
    expect(tokens).not.toContain('youtube.com');
  });

  // #43b — directive is wired into the Content-Security-Policy-Report-Only
  //        header (not just defined-but-unused). Cheap regression guard.
  it('#43b the CSP directives array is consumed by the response header', async () => {
    const source = await readNextConfigSource();
    // The header definition references the joined array.
    expect(source).toMatch(/Content-Security-Policy-Report-Only/);
    expect(source).toMatch(/cspDirectives\.join/);
  });

  // #44 — frame-src does NOT contain `*` (wildcard) or `https:` (scheme-only)
  it('#44 frame-src directive does NOT contain a wildcard `*` token', async () => {
    const source = await readNextConfigSource();
    const directive = extractFrameSrcDirective(source);
    // `*` would let any origin be framed — explicit regression guard
    // against an over-broad rewrite. The token check is for whole-token
    // matches: a path-internal `*` is implausible for frame-src so a
    // simple substring search is sufficient.
    //
    // Tokenize on whitespace (after stripping the surrounding quotes
    // and the `frame-src` directive name) so we are checking that no
    // SOURCE EXPRESSION token equals `*`.
    const tokens = directive.replace(/^['"]/, '').replace(/['"]$/, '').trim().split(/\s+/).slice(1); // drop the leading `frame-src` name

    expect(tokens).not.toContain('*');
  });

  it('#44 frame-src directive does NOT contain a `https:` schema-only token', async () => {
    const source = await readNextConfigSource();
    const directive = extractFrameSrcDirective(source);
    const tokens = directive.replace(/^['"]/, '').replace(/['"]$/, '').trim().split(/\s+/).slice(1);
    // `https:` (or `http:`) as a standalone source expression would
    // allow any host over that scheme. The directive must reference
    // explicit hostnames (origin-style, with or without scheme prefix).
    expect(tokens).not.toContain('https:');
    expect(tokens).not.toContain('http:');
  });

  // ─── Belt-and-braces: the test file itself parses the directive ───
  it('extractFrameSrcDirective returns a non-empty string with the expected anchor', async () => {
    const source = await readNextConfigSource();
    const directive = extractFrameSrcDirective(source);
    expect(directive.length).toBeGreaterThan('frame-src '.length);
    expect(directive).toMatch(/frame-src/);
  });
});
