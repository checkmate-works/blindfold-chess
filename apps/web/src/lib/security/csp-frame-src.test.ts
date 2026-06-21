import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Phase B Tester suite — D8 #43 / #44.
 *
 * SecurityEngineer Phase 1 baseline (D2) requires the CSP `frame-src`
 * directive to:
 *   - allow `www.chess.com` (the only chess-embed origin remaining
 *     after Phase 13 (#83) — Lichess /embed/{id} URLs are now
 *     rendered by the self-hosted PGN replay UI, no iframe needed,
 *     so `lichess.org` is intentionally NOT in frame-src)
 *   - NOT use `*` or `https:` schema-only tokens (regression guard
 *     against accidental over-broadening)
 *
 * The CSP is now built per-request in `src/lib/security/csp.ts` (moved
 * out of `next.config.ts` so each response can carry a per-request
 * `'nonce-<random>'`). A static-text assertion against that file is
 * the cheapest and most reliable check. A runtime header inspection
 * would require booting Next, which is out of proportion for what is
 * effectively a literal in source.
 */

async function readNextConfigSource(): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // apps/web/src/lib/security/<this file> → apps/web/src/lib/security/csp.ts
  const configPath = path.resolve(here, 'csp.ts');
  return readFile(configPath, 'utf8');
}

function extractFrameSrcDirective(source: string): string {
  // The directive is a single line of the form
  //   'frame-src googleads.g.doubleclick.net ... www.chess.com',
  // Single OR double quoted, with the directive name `frame-src` first.
  // We extract the entire string literal that contains `frame-src`.
  const match = source.match(/['"]\s*frame-src\b[^'"\n]*['"]/);
  if (!match) {
    throw new Error('frame-src directive not found in next.config.ts source');
  }
  return match[0];
}

describe('CSP frame-src — Phase B Tester #43 / #44', () => {
  // #43 — frame-src includes www.chess.com (the only chess-embed origin
  //         remaining after Phase 13 (#83); Lichess /embed/{id} is now
  //         rendered by the self-hosted PGN replay UI and no longer
  //         requires an iframe origin in the allow-list).
  it('#43 next.config.ts CSP frame-src directive contains www.chess.com', async () => {
    const source = await readNextConfigSource();
    const directive = extractFrameSrcDirective(source);
    expect(directive).toContain('www.chess.com');
  });

  // #43-phase13 — Phase 13 (#83) regression: `lichess.org` MUST NOT
  //                 appear in frame-src. The Lichess iframe was removed;
  //                 keeping the origin in frame-src would expand the
  //                 attack surface for no user-flow benefit.
  it('#43-phase13 frame-src directive does NOT contain lichess.org (Phase 13 #83)', async () => {
    const source = await readNextConfigSource();
    const directive = extractFrameSrcDirective(source);
    const tokens = directive.replace(/^['"]/, '').replace(/['"]$/, '').trim().split(/\s+/).slice(1);
    expect(tokens).not.toContain('lichess.org');
    expect(tokens).not.toContain('www.lichess.org');
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

  // AdSense renders some ad iframes from pagead2.googlesyndication.com; without
  // it production logs frame-src violations for that host.
  it('frame-src directive contains pagead2.googlesyndication.com (AdSense ad iframe host)', async () => {
    const source = await readNextConfigSource();
    const directive = extractFrameSrcDirective(source);
    expect(directive).toContain('pagead2.googlesyndication.com');
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

  // #43b — directive is wired into an enforcing Content-Security-Policy
  //        header (not just defined-but-unused). Cheap regression guard.
  it('#43b the CSP directives array is consumed by the response header', async () => {
    const source = await readNextConfigSource();
    // csp.ts exports buildCspHeader which is stamped onto the response by proxy.ts.
    expect(source).toMatch(/buildCspHeader/);
    expect(source).toMatch(/directives\.join/);
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
