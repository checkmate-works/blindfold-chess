/**
 * Where the local Supabase stack (`pnpm supabase start` from `apps/web`)
 * listens, for code that falls back to it when no connection variable is set.
 *
 * The ports themselves are decided by `apps/web/supabase/config.toml`
 * (`[api] port`, `[db] port`); the Supabase CLI binds whatever that file
 * says. These constants are a copy, because runtime code cannot read the
 * TOML file, and `local-supabase.test.ts` fails when the two disagree. To
 * move the local stack to other ports, change `config.toml` and these
 * values together; the mobile app's default (`LOCAL_SUPABASE_API_PORT` in
 * `apps/mobile/src/auth/config.ts`) is checked by the same test.
 *
 * Only the fallbacks live here. With `.env.local` filled in as
 * `.env.example` shows, the variables win and these are never read.
 *
 * Kept free of imports so that build scripts (`drizzle.config.ts`,
 * `scripts/*.ts`) can load it by relative path without dragging in the app.
 */

/** `[api] port` in `config.toml`: Supabase's HTTP API (auth, storage, REST). */
export const LOCAL_SUPABASE_API_PORT = 54321;

/** `[db] port` in `config.toml`: Postgres, without the pooler in the path. */
export const LOCAL_SUPABASE_DB_PORT = 54322;

/** The local Supabase API origin. */
export const LOCAL_SUPABASE_URL = `http://127.0.0.1:${LOCAL_SUPABASE_API_PORT}`;

/**
 * The local Postgres, reached directly as the superuser with the Supabase
 * CLI's fixed local password.
 */
export const LOCAL_DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${LOCAL_SUPABASE_DB_PORT}/postgres`;
