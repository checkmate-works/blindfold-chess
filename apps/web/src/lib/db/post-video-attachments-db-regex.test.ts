import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseYouTubeUrl } from '@/lib/games/youtube-validator';

/**
 * Tester additions — DB CHECK regex pins for `post_video_attachments`.
 *
 * The Coder suite already pins the `provider_video_id` CHECK regex
 * matches `YOUTUBE_VIDEO_ID_RE.source` byte-for-byte (in
 * `youtube-validator.test.ts`). This file extends the pin to the
 * remaining two CHECK regexes on the same table:
 *
 *   - `source_url` CHECK: must accept every `sourceUrl` the app-layer
 *     parser produces on a happy path, and must reject the obvious
 *     bypass shapes the parser also rejects.
 *   - `thumbnail_url` CHECK: must accept the canonical
 *     `img.youtube.com` template the renderer emits, and must reject
 *     a foreign host (defense-in-depth for a future oEmbed flow that
 *     persists CDN thumbnails).
 *   - `provider` CHECK: must accept exactly the providers the app
 *     understands (`'youtube'` for MVP) — pinned because widening this
 *     to e.g. `'vimeo'` requires (a) parser branch, (b) renderer
 *     mapping, (c) source_url CHECK widening — all in lockstep.
 *
 * The CHECK regexes are loaded from the migration SQL so editing one
 * side without aligning the other breaks this test.
 */

async function readMigrationSource(): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // apps/web/src/lib/db → apps/web (3 levels up).
  const migrationPath = path.resolve(
    here,
    '..',
    '..',
    '..',
    'drizzle',
    '20260504080000_create_post_video_attachments.sql'
  );
  return readFile(migrationPath, 'utf8');
}

/**
 * Extract the body of a CHECK constraint by name from the migration
 * SQL. The migration uses one of two shapes:
 *
 *   CONSTRAINT "name" CHECK ("col" ~ '^pattern$')
 *   CONSTRAINT "name"
 *     CHECK ( "col" IS NULL
 *       OR "col" ~ '^pattern1'
 *       OR "col" ~ '^pattern2'
 *       ... )
 *
 * Returns the raw substring between the outermost `CHECK (` and the
 * matching `)`. The caller decides how to parse it.
 */
function extractCheckBody(source: string, name: string): string {
  const re = new RegExp(`CONSTRAINT\\s+"${name}"\\s*\\n?\\s*CHECK\\s*\\(`);
  const m = source.match(re);
  if (!m) {
    throw new Error(`CHECK constraint "${name}" not found in migration source`);
  }
  const start = (m.index ?? 0) + m[0].length;
  // Walk forward, balancing parens.
  let depth = 1;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i);
    }
  }
  throw new Error(`unbalanced CHECK body for constraint "${name}"`);
}

function extractRegexPatterns(checkBody: string): string[] {
  // Match every `~ 'pattern'` in the body (PostgreSQL POSIX regex
  // operator). Patterns may use `\.` for literal dots — preserved
  // in the captured string as-is.
  const out: string[] = [];
  const re = /~\s*'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(checkBody)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/**
 * Convert a PostgreSQL POSIX regex to a JS RegExp so we can run the
 * same pattern against test inputs. The two regex flavors are very
 * similar; the patterns used by this migration only use features
 * supported by both (`.`, `\.`, `*`, `+`, `^`, char classes, `{n}`).
 */
function pgRegexToJs(pattern: string): RegExp {
  return new RegExp(pattern);
}

describe('post_video_attachments — provider CHECK', () => {
  it('CHECK accepts only "youtube" (MVP)', async () => {
    const source = await readMigrationSource();
    const body = extractCheckBody(source, 'post_video_attachments_chk_provider');
    // The constraint is a literal IN clause: `"provider" IN ('youtube')`.
    expect(body).toMatch(/"provider"\s+IN\s*\(\s*'youtube'\s*\)/);
    // No other discriminator should be present yet — pin so a
    // widening to 'vimeo' / 'twitch' is a deliberate test edit
    // (the parser, renderer, and source_url CHECK must widen
    // together — see the source_url CHECK rationale).
    expect(body).not.toMatch(/'vimeo'/);
    expect(body).not.toMatch(/'twitch'/);
  });
});

describe('post_video_attachments — source_url CHECK', () => {
  // The CHECK is a disjunction:
  //   "source_url" IS NULL
  //   OR "source_url" ~ '^https://www\.youtube\.com/'
  //   OR "source_url" ~ '^https://youtube\.com/'
  //   OR "source_url" ~ '^https://youtu\.be/'
  //   OR "source_url" ~ '^https://www\.youtube-nocookie\.com/'
  //
  // The intent is "host allow-list (coarse, prefix-style) so a hostile
  // direct INSERT cannot smuggle a non-YouTube URL into the column".
  // We pin both:
  //   (a) every URL the app-layer parser produces on a happy path
  //       must satisfy the CHECK (no "validator OK / DB CHECK reject"
  //       divergence on the same input);
  //   (b) the obvious bypass shapes (http://, IDN, suffix lookalike)
  //       must be rejected.

  let patterns: string[] = [];

  it('extracts the CHECK pattern set from the migration', async () => {
    const source = await readMigrationSource();
    const body = extractCheckBody(source, 'post_video_attachments_chk_source_url');
    patterns = extractRegexPatterns(body);
    expect(patterns.length).toBe(4);
    expect(patterns).toContain('^https://www\\.youtube\\.com/');
    expect(patterns).toContain('^https://youtube\\.com/');
    expect(patterns).toContain('^https://youtu\\.be/');
    expect(patterns).toContain('^https://www\\.youtube-nocookie\\.com/');
  });

  it('CHECK accepts every sourceUrl the app-layer parser produces (alignment with happy paths)', async () => {
    const source = await readMigrationSource();
    const body = extractCheckBody(source, 'post_video_attachments_chk_source_url');
    const checkRegexes = extractRegexPatterns(body).map(pgRegexToJs);
    const accept = (url: string) => checkRegexes.some((re) => re.test(url));

    const VALID_ID = 'VALIDID0001';
    const HAPPY_PATHS = [
      `https://www.youtube.com/watch?v=${VALID_ID}`,
      `https://youtube.com/watch?v=${VALID_ID}`,
      `https://www.youtube.com/shorts/${VALID_ID}`,
      `https://www.youtube.com/live/${VALID_ID}`,
      `https://www.youtube.com/embed/${VALID_ID}`,
      `https://youtu.be/${VALID_ID}`,
      `https://youtu.be/${VALID_ID}?si=trackingjunk`,
      `https://www.youtube-nocookie.com/embed/${VALID_ID}`,
    ];

    for (const url of HAPPY_PATHS) {
      const r = parseYouTubeUrl(url);
      expect(r.ok, `parser rejected happy-path URL: ${url}`).toBe(true);
      if (r.ok) {
        expect(
          accept(r.value.sourceUrl),
          `DB CHECK rejected parser-OK sourceUrl: ${r.value.sourceUrl}`
        ).toBe(true);
      }
    }
  });

  it('CHECK rejects obvious bypass shapes (http, IDN, suffix lookalike, evil host)', async () => {
    const source = await readMigrationSource();
    const body = extractCheckBody(source, 'post_video_attachments_chk_source_url');
    const checkRegexes = extractRegexPatterns(body).map(pgRegexToJs);
    const accept = (url: string) => checkRegexes.some((re) => re.test(url));

    const REJECT = [
      // http (not https) — protocol allow-list
      'http://www.youtube.com/watch?v=VALIDID0001',
      // suffix lookalike
      'https://www.youtube.com.attacker.tld/watch?v=VALIDID0001',
      // evil host
      'https://evil.tld/watch?v=VALIDID0001',
      // IDN punycode lookalike
      'https://xn--youtub-zwa.com/watch?v=VALIDID0001',
      // path-as-host
      'https://attacker.tld/www.youtube.com/watch?v=VALIDID0001',
      // pure pathname (would not be parsable, but pin the CHECK anyway)
      '/watch?v=VALIDID0001',
      // literal junk
      'not a url at all',
      // empty string (parser would reject as invalid_url; pin DB-side
      // rejection for the case where a direct INSERT bypasses the parser)
      '',
    ];

    for (const url of REJECT) {
      expect(accept(url), `DB CHECK accepted bypass URL: ${url}`).toBe(false);
    }
  });

  it('CHECK accepts NULL source_url (column is nullable for direct API inserts that do not capture it)', async () => {
    const source = await readMigrationSource();
    const body = extractCheckBody(source, 'post_video_attachments_chk_source_url');
    // The CHECK begins with `"source_url" IS NULL OR ...`. Pin that
    // the IS NULL branch is present so a future tightening to
    // NOT NULL + non-null CHECK is a deliberate decision.
    expect(body).toMatch(/"source_url"\s+IS\s+NULL/);
  });
});

describe('post_video_attachments — thumbnail_url CHECK', () => {
  it('CHECK accepts the canonical img.youtube.com template the renderer emits', async () => {
    const source = await readMigrationSource();
    const body = extractCheckBody(source, 'post_video_attachments_chk_thumbnail_url');
    const checkRegexes = extractRegexPatterns(body).map(pgRegexToJs);
    const accept = (url: string) => checkRegexes.some((re) => re.test(url));

    // The renderer derives `data-thumbnail` as
    //   https://img.youtube.com/vi/{id}/hqdefault.jpg
    // (see AttachedVideoCard.tsx). Pin that the same template would
    // pass the DB CHECK if a future oEmbed flow persists it.
    const VALID_ID = 'VALIDID0001';
    expect(accept(`https://img.youtube.com/vi/${VALID_ID}/hqdefault.jpg`)).toBe(true);
    // The other accepted host is ytimg.com — used by oEmbed responses
    // and the YouTube CDN.
    expect(accept(`https://i.ytimg.com/vi/${VALID_ID}/hqdefault.jpg`)).toBe(true);
  });

  it('CHECK rejects foreign hosts and http variants', async () => {
    const source = await readMigrationSource();
    const body = extractCheckBody(source, 'post_video_attachments_chk_thumbnail_url');
    const checkRegexes = extractRegexPatterns(body).map(pgRegexToJs);
    const accept = (url: string) => checkRegexes.some((re) => re.test(url));

    const REJECT = [
      'http://img.youtube.com/vi/VALIDID0001/hqdefault.jpg',
      'http://i.ytimg.com/vi/VALIDID0001/hqdefault.jpg',
      'https://attacker.tld/img.youtube.com/vi/VALIDID0001/hqdefault.jpg',
      'https://www.youtube.com/vi/VALIDID0001/hqdefault.jpg',
      'data:image/png;base64,AAAA',
      'javascript:alert(1)',
      '',
    ];

    for (const url of REJECT) {
      expect(accept(url), `thumbnail CHECK accepted bypass URL: ${url}`).toBe(false);
    }
  });

  it('CHECK accepts NULL thumbnail_url (MVP renderer derives at read time)', async () => {
    const source = await readMigrationSource();
    const body = extractCheckBody(source, 'post_video_attachments_chk_thumbnail_url');
    expect(body).toMatch(/"thumbnail_url"\s+IS\s+NULL/);
  });
});
