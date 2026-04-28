import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Integration tests for the DB-level guarantees on `post_game_attachments`.
 *
 * These tests are DB-bound by design — the things they verify (CHECK
 * constraints, view aliasing) only exist in PostgreSQL, so a mocked
 * Drizzle client cannot exercise them. The suite is opt-in via the
 * presence of `DATABASE_URL` / `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING`
 * (the same env-var priority `migrate.ts` uses). On a workstation with
 * `supabase start` running this is the local Supabase Postgres at
 * `127.0.0.1:54322`. In CI without a Postgres, the suite is skipped.
 *
 * The fixture row is inserted via service-role-equivalent (direct
 * Postgres client, bypassing RLS) and cleaned up in `afterAll`. Each
 * test uses the same post id and inserts/deletes its own attachment
 * row (post_id is UNIQUE on attachments).
 *
 * @design Skip strategy
 *
 * `it.skipIf(!dbAvailable)` cannot be used — `dbAvailable` is captured
 * at collection time, before `beforeAll` runs. Instead each test calls
 * `requireDb(ctx)` which marks the test as skipped from inside the
 * test body when the probe in `beforeAll` did not succeed.
 */

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  // Default matches `apps/web/src/lib/db/index.ts` and the local
  // Supabase setup in CLAUDE.md. If the host is unreachable the
  // beforeAll() probe fails closed and the whole suite is skipped.
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

type Sql = ReturnType<typeof postgres>;

let sql: Sql | null = null;
let dbAvailable = false;
let testPostId: string | null = null;
let skipReason = '';

function requireDb(ctx: { skip: () => void }): Sql {
  if (!dbAvailable || !sql) {
    console.warn(`[post-game-attachments.integration] skipped: ${skipReason}`);
    ctx.skip();
    throw new Error('unreachable');
  }
  return sql;
}

beforeAll(async () => {
  try {
    sql = postgres(connectionString, { prepare: false, max: 1, connect_timeout: 2 });
    // Probe: does the canonical table exist?
    const probe = await sql`
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'post_game_attachments'
    `;
    if (probe.length === 0) {
      skipReason = 'post_game_attachments table not present (migrations not applied?)';
      await sql.end({ timeout: 1 });
      sql = null;
      return;
    }
    // Create a parent topic_post row to satisfy the FK on
    // post_game_attachments. The auth.users FK on topic_posts.user_id
    // is enforced when the migrate.ts Supabase-side SQL has run, so we
    // (a) try to insert the fixture user into auth.users (postgres
    // superuser has access), and (b) on any failure we fall back to
    // querying for an existing topic_posts row to reuse — that's good
    // enough for read-only checks but means the INSERT-rejection
    // sub-tests will still skip if no fixture row is reachable.
    const userId = '00000000-0000-0000-0000-0000feedface';
    try {
      await sql`
        INSERT INTO auth.users (id, email)
        VALUES (${userId}::uuid, 'phasef-integration@example.invalid')
        ON CONFLICT (id) DO NOTHING
      `;
    } catch {
      // auth schema may not be present in non-Supabase environments.
      // We still try the topic_posts insert below; if that fails too
      // we'll skip the suite.
    }
    const inserted = await sql<{ id: string }[]>`
      INSERT INTO topic_posts (
        user_id, topic_type, topic_key, content, reply_permission
      )
      VALUES (
        ${userId}::uuid,
        'integration_test',
        'phase-f',
        'integration test fixture',
        'everyone'
      )
      RETURNING id
    `;
    testPostId = inserted[0].id;
    dbAvailable = true;
  } catch (err) {
    // No DB reachable. Tests below short-circuit via requireDb().
    skipReason = `DB unreachable: ${err instanceof Error ? err.message : String(err)}`;
    if (sql) {
      try {
        await sql.end({ timeout: 1 });
      } catch {
        // ignore
      }
    }
    sql = null;
  }
});

afterAll(async () => {
  if (sql) {
    try {
      if (testPostId) {
        // CASCADE drops any attachment rows linked to the post.
        await sql`DELETE FROM topic_posts WHERE id = ${testPostId}::uuid`;
      }
      // Best-effort cleanup of the fixture auth user. CASCADE on the
      // user_id FK already dropped any attached rows; this just keeps
      // the local Supabase auth.users table tidy across re-runs.
      try {
        await sql`
          DELETE FROM auth.users
          WHERE id = '00000000-0000-0000-0000-0000feedface'::uuid
        `;
      } catch {
        // ignore (no auth schema, or already gone)
      }
      await sql.end({ timeout: 1 });
    } catch {
      // ignore
    }
  }
});

const VALID_PGN = '1. e4 e5 2. Nf3 Nc6';

describe('post_game_attachments integration', () => {
  describe('chk_pgn_byte_length_matches_octet_length (M-3)', () => {
    it('rejects an INSERT where pgn_byte_length disagrees with octet_length(pgn)', async (ctx) => {
      const db = requireDb(ctx);
      // The CHECK pins the precomputed value to the actual byte
      // length of the persisted PGN. A row that claims pgn_byte_length=10
      // for a 19-byte PGN must be rejected at the DB level even when
      // the row satisfies the upper-bound check `pgn_byte_length <= 102400`.
      // Without this CHECK an attacker could submit a tiny precomputed
      // value alongside an oversized PGN and slip past the cap.
      await expect(
        db`
          INSERT INTO post_game_attachments (
            post_id, source, pgn, pgn_byte_length, move_count
          )
          VALUES (
            ${testPostId}::uuid, 'pgn', ${VALID_PGN}, 10, 4
          )
        `
      ).rejects.toThrow(/chk_pgn_byte_length_matches_octet_length/);
    });

    it('accepts an INSERT where pgn_byte_length equals octet_length(pgn)', async (ctx) => {
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      await db`
        INSERT INTO post_game_attachments (
          post_id, source, pgn, pgn_byte_length, move_count
        )
        VALUES (
          ${testPostId}::uuid, 'pgn', ${VALID_PGN}, ${expectedLength}, 4
        )
      `;
      const rows = await db<{ pgn_byte_length: number }[]>`
        SELECT pgn_byte_length
        FROM post_game_attachments
        WHERE post_id = ${testPostId}::uuid
      `;
      expect(rows.length).toBe(1);
      expect(rows[0].pgn_byte_length).toBe(expectedLength);
      // Cleanup so the next test starts fresh.
      await db`DELETE FROM post_game_attachments WHERE post_id = ${testPostId}::uuid`;
    });
  });

  describe('chk_attribution_pair (C-2)', () => {
    it('rejects an INSERT with attribution_platform set but attribution_path NULL', async (ctx) => {
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      await expect(
        db`
          INSERT INTO post_game_attachments (
            post_id, source, pgn, pgn_byte_length, move_count,
            attribution_platform, attribution_path
          )
          VALUES (
            ${testPostId}::uuid, 'pgn', ${VALID_PGN}, ${expectedLength}, 4,
            'chesscom', NULL
          )
        `
      ).rejects.toThrow(/chk_attribution_pair/);
    });

    it('rejects an attribution_platform value outside the allow-list', async (ctx) => {
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      await expect(
        db`
          INSERT INTO post_game_attachments (
            post_id, source, pgn, pgn_byte_length, move_count,
            attribution_platform, attribution_path
          )
          VALUES (
            ${testPostId}::uuid, 'pgn', ${VALID_PGN}, ${expectedLength}, 4,
            'evil-platform', '/foo'
          )
        `
      ).rejects.toThrow(/chk_attribution_platform_valid/);
    });

    it('rejects an attribution_path that does not match the strict regex', async (ctx) => {
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      await expect(
        db`
          INSERT INTO post_game_attachments (
            post_id, source, pgn, pgn_byte_length, move_count,
            attribution_platform, attribution_path
          )
          VALUES (
            ${testPostId}::uuid, 'pgn', ${VALID_PGN}, ${expectedLength}, 4,
            'chesscom', '/foo?next=evil'
          )
        `
      ).rejects.toThrow(/chk_attribution_path_format/);
    });
  });

  describe('chk_source_url_audit_https (Phase H M-3)', () => {
    // `source_url` is documented as audit-only — the renderer never
    // reads it back as an href (see AttachedGameCard.tsx + the
    // @security TSDoc on the column). The CHECK below is the last
    // line of defense if a future refactor accidentally surfaces
    // the column as a link: hostile schemes (`javascript:`, `data:`,
    // `file:`, ...) and even plain `http://` are rejected at write
    // time, regardless of the application path that submitted them.
    it('rejects javascript: scheme on source_url', async (ctx) => {
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      await expect(
        db`
          INSERT INTO post_game_attachments (
            post_id, source, source_url, source_game_id,
            pgn, pgn_byte_length, move_count
          )
          VALUES (
            ${testPostId}::uuid, 'lichess',
            'javascript:alert(1)', 'abcd1234',
            ${VALID_PGN}, ${expectedLength}, 4
          )
        `
      ).rejects.toThrow(/chk_source_url_audit_https/);
    });

    it('rejects data: scheme on source_url', async (ctx) => {
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      await expect(
        db`
          INSERT INTO post_game_attachments (
            post_id, source, source_url, source_game_id,
            pgn, pgn_byte_length, move_count
          )
          VALUES (
            ${testPostId}::uuid, 'lichess',
            'data:text/html,<script>alert(1)</script>', 'abcd1234',
            ${VALID_PGN}, ${expectedLength}, 4
          )
        `
      ).rejects.toThrow(/chk_source_url_audit_https/);
    });

    it('rejects plain http:// (https-only policy)', async (ctx) => {
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      await expect(
        db`
          INSERT INTO post_game_attachments (
            post_id, source, source_url, source_game_id,
            pgn, pgn_byte_length, move_count
          )
          VALUES (
            ${testPostId}::uuid, 'lichess',
            'http://lichess.org/abcd1234', 'abcd1234',
            ${VALID_PGN}, ${expectedLength}, 4
          )
        `
      ).rejects.toThrow(/chk_source_url_audit_https/);
    });

    it('accepts a canonical https://lichess.org URL', async (ctx) => {
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      await db`
        INSERT INTO post_game_attachments (
          post_id, source, source_url, source_game_id,
          pgn, pgn_byte_length, move_count
        )
        VALUES (
          ${testPostId}::uuid, 'lichess',
          'https://lichess.org/abcd1234', 'abcd1234',
          ${VALID_PGN}, ${expectedLength}, 4
        )
      `;
      const rows = await db<{ source_url: string }[]>`
        SELECT source_url
        FROM post_game_attachments
        WHERE post_id = ${testPostId}::uuid
      `;
      expect(rows.length).toBe(1);
      expect(rows[0].source_url).toBe('https://lichess.org/abcd1234');
      // Cleanup so the next test starts fresh.
      await db`DELETE FROM post_game_attachments WHERE post_id = ${testPostId}::uuid`;
    });

    it('accepts NULL source_url (pure-PGN attachment)', async (ctx) => {
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      await db`
        INSERT INTO post_game_attachments (
          post_id, source, source_url, pgn, pgn_byte_length, move_count
        )
        VALUES (
          ${testPostId}::uuid, 'pgn', NULL, ${VALID_PGN}, ${expectedLength}, 4
        )
      `;
      const rows = await db<{ source_url: string | null }[]>`
        SELECT source_url
        FROM post_game_attachments
        WHERE post_id = ${testPostId}::uuid
      `;
      expect(rows.length).toBe(1);
      expect(rows[0].source_url).toBeNull();
      // Cleanup so the next test starts fresh.
      await db`DELETE FROM post_game_attachments WHERE post_id = ${testPostId}::uuid`;
    });
  });

  describe('attribution_path length boundary at the regex edge', () => {
    // The CHECK regex `^/[A-Za-z0-9/_-]{1,128}$` caps the path body at
    // 128 chars after the leading slash (129 chars total). The column
    // itself is varchar(160) — wider than the regex deliberately so a
    // future regex widening does not need a column migration. The two
    // tests below pin (a) the largest accepted value and (b) the
    // smallest rejected value at the regex boundary, so a future
    // regex tweak from `{1,128}` to anything else surfaces here as
    // either a passing reject test or a failing accept test.
    it('accepts attribution_path with EXACTLY 128 body chars (regex upper bound)', async (ctx) => {
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      const path128 = `/${'a'.repeat(128)}`;
      await db`
        INSERT INTO post_game_attachments (
          post_id, source, pgn, pgn_byte_length, move_count,
          attribution_platform, attribution_path
        )
        VALUES (
          ${testPostId}::uuid, 'pgn', ${VALID_PGN}, ${expectedLength}, 4,
          'chesscom', ${path128}
        )
      `;
      const rows = await db<{ attribution_path: string }[]>`
        SELECT attribution_path FROM post_game_attachments
        WHERE post_id = ${testPostId}::uuid
      `;
      expect(rows.length).toBe(1);
      expect(rows[0].attribution_path).toBe(path128);
      expect(rows[0].attribution_path.length).toBe(129); // 1 leading `/` + 128 body
      await db`DELETE FROM post_game_attachments WHERE post_id = ${testPostId}::uuid`;
    });

    it('rejects attribution_path with 129 body chars (one above the regex cap)', async (ctx) => {
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      const path129 = `/${'a'.repeat(129)}`;
      await expect(
        db`
          INSERT INTO post_game_attachments (
            post_id, source, pgn, pgn_byte_length, move_count,
            attribution_platform, attribution_path
          )
          VALUES (
            ${testPostId}::uuid, 'pgn', ${VALID_PGN}, ${expectedLength}, 4,
            'chesscom', ${path129}
          )
        `
      ).rejects.toThrow(/chk_attribution_path_format/);
    });

    it('rejects attribution_path containing a percent (e.g. URL-encoded space)', async (ctx) => {
      // The path regex `[A-Za-z0-9/_-]` excludes `%`. A pasted path
      // that survived percent-encoding by `new URL(...)` (e.g. a
      // literal space) should be caught at the parser layer; this
      // test pins the DB-level failure mode in case the parser layer
      // is ever bypassed (direct REST write, manual SQL).
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      await expect(
        db`
          INSERT INTO post_game_attachments (
            post_id, source, pgn, pgn_byte_length, move_count,
            attribution_platform, attribution_path
          )
          VALUES (
            ${testPostId}::uuid, 'pgn', ${VALID_PGN}, ${expectedLength}, 4,
            'chesscom', '/foo%20bar'
          )
        `
      ).rejects.toThrow(/chk_attribution_path_format/);
    });

    it('rejects attribution_path containing a stray U+200B zero-width space', async (ctx) => {
      // ZWSP characters in the persisted path could let two
      // attribution rows look identical to a moderator while pointing
      // at different chess.com URLs. The regex `[A-Za-z0-9/_-]`
      // rejects U+200B because it is not in the allow-list — pin so
      // a future regex widening (e.g. switching to `\S`) cannot
      // silently let this slip through.
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      const sneakyPath = `/foo${String.fromCharCode(0x200b)}bar`;
      await expect(
        db`
          INSERT INTO post_game_attachments (
            post_id, source, pgn, pgn_byte_length, move_count,
            attribution_platform, attribution_path
          )
          VALUES (
            ${testPostId}::uuid, 'pgn', ${VALID_PGN}, ${expectedLength}, 4,
            'chesscom', ${sneakyPath}
          )
        `
      ).rejects.toThrow(/chk_attribution_path_format/);
    });
  });

  describe('chk_attribution_pair (reverse direction)', () => {
    it('rejects an INSERT with attribution_path set but attribution_platform NULL', async (ctx) => {
      // The "platform set, path NULL" direction is already covered
      // above. Pin the reverse direction so a future single-direction
      // CHECK rewrite (e.g. enforcing only `path IS NULL OR platform
      // IS NOT NULL`) surfaces in CI.
      const db = requireDb(ctx);
      const expectedLength = Buffer.byteLength(VALID_PGN, 'utf8');
      await expect(
        db`
          INSERT INTO post_game_attachments (
            post_id, source, pgn, pgn_byte_length, move_count,
            attribution_platform, attribution_path
          )
          VALUES (
            ${testPostId}::uuid, 'pgn', ${VALID_PGN}, ${expectedLength}, 4,
            NULL, '/game/live/12345'
          )
        `
      ).rejects.toThrow(/chk_attribution_pair/);
    });
  });

  describe('rename compatibility view (H-5)', () => {
    it('still allows SELECT * FROM topic_post_attachments via the compat VIEW', async (ctx) => {
      const db = requireDb(ctx);
      // Old-deploy code paths that have not yet picked up the
      // renamed symbol must keep working during the rolling deploy
      // window. Migration 1 ships a read-only VIEW under the old
      // name; this assertion pins that contract.
      const rows = await db<{ check: string }[]>`
        SELECT 'view ok'::text AS check
        FROM topic_post_attachments
        LIMIT 1
      `;
      // We do not assert on row count — the suite may run on an
      // empty fixture DB. What we assert is that the SELECT does
      // not throw an "undefined relation" error.
      expect(Array.isArray(rows)).toBe(true);
    });
  });
});
