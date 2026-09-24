import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * DB CHECK + RLS pins for `post_game_embed_attachments`.
 * (PGN/embed exclusivity is enforced in the Server Action, not by a
 * constraint — see `createChunkPostWithEmbedAttachment.test.ts`.)
 *
 * Mirrors `post-game-attachments.integration.test.ts`. DB-bound tests
 * for the CHECK constraints and RLS policies on
 * `post_game_embed_attachments`. The suite probes for a reachable
 * Postgres in `beforeAll` and skips every test inside if the probe
 * fails (CI-without-Postgres compatibility).
 *
 * @design Skip strategy
 *
 * Same shape as the PGN integration suite: each test calls
 * `requireDb(ctx)` so individual tests can mark themselves skipped from
 * inside the test body even though `dbAvailable` is determined in
 * `beforeAll`. `it.skipIf(...)` cannot be used because the predicate
 * is evaluated at collection time, before `beforeAll` runs.
 *
 * @design RLS testing
 *
 * Tests that exercise RLS use Postgres' `SET LOCAL ROLE authenticated`
 * + `SET LOCAL "request.jwt.claims" = '{"sub":"<uuid>","role":"authenticated"}'`
 * inside a transaction, then `RESET ROLE` (implicitly on tx commit /
 * rollback). This is the same shape Supabase's PostgREST / supabase-js
 * uses internally to attach the JWT-derived `auth.uid()`.
 *
 * Tests that only exercise CHECK constraints (no RLS dependency) run
 * as the postgres superuser, mirroring the PGN integration suite.
 */

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

type Sql = ReturnType<typeof postgres>;
type TxSql = postgres.TransactionSql;

let sql: Sql | null = null;
let dbAvailable = false;
let testPostId: string | null = null;
let secondPostId: string | null = null;
let skipReason = '';

const ownerUserId = '00000000-0000-0000-0000-0000feedb1eb';
const otherUserId = '00000000-0000-0000-0000-0000feedb2eb';

function requireDb(ctx: { skip: () => void }): Sql {
  if (!dbAvailable || !sql) {
    console.warn(`[post-game-embed-attachments.integration] skipped: ${skipReason}`);
    ctx.skip();
    throw new Error('unreachable');
  }
  return sql;
}

beforeAll(async () => {
  try {
    sql = postgres(connectionString, { prepare: false, max: 1, connect_timeout: 2 });
    const probe = await sql`
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'post_game_embed_attachments'
    `;
    if (probe.length === 0) {
      skipReason = 'post_game_embed_attachments table not present (migrations not applied?)';
      await sql.end({ timeout: 1 });
      sql = null;
      return;
    }

    // Insert two fixture auth users (owner + a non-author for RLS
    // asymmetry tests). On environments without auth schema, fall back
    // gracefully.
    try {
      await sql`
        INSERT INTO auth.users (id, email)
        VALUES (${ownerUserId}::uuid, 'embed-owner@example.invalid')
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        INSERT INTO auth.users (id, email)
        VALUES (${otherUserId}::uuid, 'embed-other@example.invalid')
        ON CONFLICT (id) DO NOTHING
      `;
    } catch {
      // No auth schema. RLS tests will skip per-test via requireDb()
      // because we cannot create a user; CHECK tests will still run
      // since they do not need a user fixture.
    }

    // Owner's post (the parent of the embed attachment under test).
    const inserted = await sql<{ id: string }[]>`
      INSERT INTO topic_posts (
        user_id, topic_type, topic_key, content, reply_permission
      )
      VALUES (
        ${ownerUserId}::uuid,
        'integration_test',
        'phase-b-embed',
        'phase B embed integration fixture',
        'everyone'
      )
      RETURNING id
    `;
    testPostId = inserted[0].id;

    // A second post owned by the SAME user, used by the soft-delete /
    // RLS-asymmetry tests. (We cannot mutate the first post's
    // deleted_at without breaking other tests that need it visible.)
    const inserted2 = await sql<{ id: string }[]>`
      INSERT INTO topic_posts (
        user_id, topic_type, topic_key, content, reply_permission
      )
      VALUES (
        ${ownerUserId}::uuid,
        'integration_test',
        'phase-b-embed-2',
        'phase B embed integration fixture (soft-delete)',
        'everyone'
      )
      RETURNING id
    `;
    secondPostId = inserted2[0].id;

    dbAvailable = true;
  } catch (err) {
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
        await sql`DELETE FROM topic_posts WHERE id = ${testPostId}::uuid`;
      }
      if (secondPostId) {
        await sql`DELETE FROM topic_posts WHERE id = ${secondPostId}::uuid`;
      }
      try {
        await sql`DELETE FROM auth.users WHERE id = ${ownerUserId}::uuid`;
        await sql`DELETE FROM auth.users WHERE id = ${otherUserId}::uuid`;
      } catch {
        // ignore (no auth schema or rows already gone)
      }
      await sql.end({ timeout: 1 });
    } catch {
      // ignore
    }
  }
});

describe('post_game_embed_attachments — DB CHECK constraints (#35〜#38)', () => {
  // embed_id `/` rejected
  it('rejects an INSERT with embed_id containing `/` (chk_embed_id_format)', async (ctx) => {
    const db = requireDb(ctx);
    await expect(
      db`
        INSERT INTO post_game_embed_attachments (
          post_id, embed_provider, embed_id
        )
        VALUES (
          ${testPostId}::uuid, 'chesscom', 'abc/def'
        )
      `
    ).rejects.toThrow(/chk_embed_id_format/);
  });

  // embed_provider 'youtube' rejected
  it('rejects an INSERT with embed_provider = "youtube" (chk_embed_provider_valid)', async (ctx) => {
    const db = requireDb(ctx);
    await expect(
      db`
        INSERT INTO post_game_embed_attachments (
          post_id, embed_provider, embed_id
        )
        VALUES (
          ${testPostId}::uuid, 'youtube', 'abc12345'
        )
      `
    ).rejects.toThrow(/chk_embed_provider_valid/);
  });

  // retiring the Lichess /embed iframe (#83) narrowed the
  // CHECK from IN ('chesscom', 'lichess') to IN ('chesscom').
  // Regression guard: a Lichess row must never be insertable again.
  it('rejects an INSERT with embed_provider = "lichess" (chk_embed_provider_valid)', async (ctx) => {
    const db = requireDb(ctx);
    await expect(
      db`
        INSERT INTO post_game_embed_attachments (
          post_id, embed_provider, embed_id
        )
        VALUES (
          ${testPostId}::uuid, 'lichess', 'abcd1234'
        )
      `
    ).rejects.toThrow(/chk_embed_provider_valid/);
  });

  // http:// source_url rejected
  it('rejects an INSERT with source_url = "http://..." (chk_embed_source_url_https)', async (ctx) => {
    const db = requireDb(ctx);
    await expect(
      db`
        INSERT INTO post_game_embed_attachments (
          post_id, embed_provider, embed_id, source_url
        )
        VALUES (
          ${testPostId}::uuid, 'chesscom', 'abcd1234',
          'http://www.chess.com/game/live/abcd1234'
        )
      `
    ).rejects.toThrow(/chk_embed_source_url_https/);
  });

  // attribution pair invariant (platform set, path NULL)
  it('rejects INSERT with attribution_platform = "chesscom" + attribution_path = NULL (chk_embed_attribution_pair)', async (ctx) => {
    const db = requireDb(ctx);
    await expect(
      db`
        INSERT INTO post_game_embed_attachments (
          post_id, embed_provider, embed_id,
          attribution_platform, attribution_path
        )
        VALUES (
          ${testPostId}::uuid, 'chesscom', 'abcd1234',
          'chesscom', NULL
        )
      `
    ).rejects.toThrow(/chk_embed_attribution_pair/);
  });

  // ─── Belt-and-braces: happy path is accepted ───
  it('accepts a canonical Chess.com embed row (cleanup-friendly happy path)', async (ctx) => {
    const db = requireDb(ctx);
    await db`
      INSERT INTO post_game_embed_attachments (
        post_id, embed_provider, embed_id, source_url,
        attribution_platform, attribution_path
      )
      VALUES (
        ${testPostId}::uuid, 'chesscom', 'abcd1234',
        'https://www.chess.com/game/live/abcd1234',
        'chesscom', '/game/live/abcd1234'
      )
    `;
    const rows = await db<{ embed_id: string }[]>`
      SELECT embed_id FROM post_game_embed_attachments
      WHERE post_id = ${testPostId}::uuid
    `;
    expect(rows.length).toBe(1);
    expect(rows[0].embed_id).toBe('abcd1234');
    await db`DELETE FROM post_game_embed_attachments WHERE post_id = ${testPostId}::uuid`;
  });
});

describe('post_game_embed_attachments — RLS policies (#39〜#41)', () => {
  /**
   * Helper: run `body` inside a transaction whose role is set to
   * `authenticated` and whose `auth.uid()` resolves to `userId`. The
   * transaction is always rolled back at the end (via a thrown sentinel
   * caught here) so writes inside `body` do not persist across tests.
   *
   * Supabase's `auth.uid()` resolves
   * `current_setting('request.jwt.claim.sub')` (legacy single-key form)
   * OR `current_setting('request.jwt.claims')::jsonb ->> 'sub'`. We set
   * the legacy form because it is both shorter to write and is what the
   * installed `auth.uid()` definition probes first. Switching role
   * happens AFTER setting the claim so the role switch does not strip
   * permissions to write the session var.
   */
  type Sentinel = { __rollback: true };
  const ROLLBACK_SENTINEL: Sentinel = { __rollback: true };

  async function asAuthenticated<T>(
    db: Sql,
    userId: string,
    body: (txSql: TxSql) => Promise<T>
  ): Promise<T> {
    let captured: T | undefined;
    let captureError: unknown = undefined;
    try {
      await db.begin(async (txSql) => {
        await txSql`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
        await txSql`SET LOCAL ROLE authenticated`;
        try {
          captured = await body(txSql);
        } catch (err) {
          captureError = err;
        }
        // Always roll back by throwing the sentinel; postgres-js will
        // surface this as a normal exception out of `begin`, which we
        // swallow below.
        throw ROLLBACK_SENTINEL;
      });
    } catch (err) {
      if (err !== ROLLBACK_SENTINEL) {
        // A different error escaped the transaction — propagate it.
        throw err;
      }
    }
    if (captureError !== undefined) {
      throw captureError;
    }
    return captured as T;
  }

  /**
   * Helper: run `body` as the unauthenticated `anon` role (mirrors the
   * Supabase anon JWT). RLS SELECT policies that USING (... auth.uid()
   * ...) silently return zero rows for anon because `auth.uid()` is
   * NULL — which is exactly the property we want to verify.
   */
  async function asAnon<T>(db: Sql, body: (txSql: TxSql) => Promise<T>): Promise<T> {
    let captured: T | undefined;
    let captureError: unknown = undefined;
    try {
      await db.begin(async (txSql) => {
        await txSql`SET LOCAL ROLE anon`;
        try {
          captured = await body(txSql);
        } catch (err) {
          captureError = err;
        }
        throw ROLLBACK_SENTINEL;
      });
    } catch (err) {
      if (err !== ROLLBACK_SENTINEL) {
        throw err;
      }
    }
    if (captureError !== undefined) {
      throw captureError;
    }
    return captured as T;
  }

  // anonymous SELECT cannot see attachments under soft-deleted posts
  it('anonymous client cannot SELECT rows under a soft-deleted post', async (ctx) => {
    const db = requireDb(ctx);

    // Pre-state: insert one embed row under secondPostId via service
    // role (superuser bypass), then soft-delete the parent post.
    // We do this OUTSIDE the asAnon transaction so the row exists when
    // we read inside the anon transaction.
    await db`
      INSERT INTO post_game_embed_attachments (
        post_id, embed_provider, embed_id
      )
      VALUES (
        ${secondPostId}::uuid, 'chesscom', 'sft1abcd'
      )
    `;
    await db`
      UPDATE topic_posts SET deleted_at = now()
      WHERE id = ${secondPostId}::uuid
    `;

    try {
      const visibleRows = await asAnon(db, async (tx) => {
        return tx<{ id: string }[]>`
          SELECT id FROM post_game_embed_attachments
          WHERE post_id = ${secondPostId}::uuid
        `;
      });
      // RLS hides the row from anon when parent is soft-deleted.
      expect(visibleRows.length).toBe(0);
    } finally {
      // Cleanup: un-soft-delete + drop the embed row so subsequent tests
      // can reuse secondPostId.
      await db`
        UPDATE topic_posts SET deleted_at = NULL
        WHERE id = ${secondPostId}::uuid
      `;
      await db`
        DELETE FROM post_game_embed_attachments
        WHERE post_id = ${secondPostId}::uuid
      `;
    }
  });

  // Client roles hold no write privilege on this table at all (see the closing
  // REVOKE in foreign_keys_and_grants.sql): embeds are attached and detached by
  // the post Server Actions on the Drizzle connection. So even the post's own
  // author is refused at the privilege check, before RLS is consulted.
  async function expectPermissionDenied(run: () => Promise<unknown>) {
    await expect(run()).rejects.toThrow(/permission denied for table post_game_embed_attachments/);
  }

  it('the post author cannot INSERT an embed through the client role', async (ctx) => {
    const db = requireDb(ctx);

    await expectPermissionDenied(() =>
      asAuthenticated(db, ownerUserId, async (tx) => {
        await tx`
          INSERT INTO post_game_embed_attachments (
            post_id, embed_provider, embed_id
          )
          VALUES (
            ${testPostId}::uuid, 'chesscom', 'frnd1234'
          )
        `;
      })
    );
  });

  it('the post author cannot DELETE their embed through the client role', async (ctx) => {
    const db = requireDb(ctx);

    await db`
      INSERT INTO post_game_embed_attachments (
        post_id, embed_provider, embed_id
      )
      VALUES (
        ${secondPostId}::uuid, 'chesscom', 'asym1234'
      )
    `;

    try {
      await expectPermissionDenied(() =>
        asAuthenticated(db, ownerUserId, async (tx) => {
          await tx`
            DELETE FROM post_game_embed_attachments
            WHERE post_id = ${secondPostId}::uuid
          `;
        })
      );
    } finally {
      await db`
        DELETE FROM post_game_embed_attachments
        WHERE post_id = ${secondPostId}::uuid
      `;
    }
  });
});
