# Local Development and Database Migrations

## Supabase Local

Local development uses the [Supabase CLI](https://supabase.com/docs/guides/local-development) instead of standalone PostgreSQL. Supabase local provides PostgreSQL, Auth (GoTrue), Storage, Studio, and Mailpit (email testing) in Docker containers.

The CLI is bundled as a devDependency of `apps/web` (`supabase/config.toml` is
version-coupled to it), so always run it as `pnpm supabase ...` from `apps/web`
— never a globally installed `supabase`.

```bash
cd apps/web

# Start Supabase local (first run downloads Docker images)
pnpm supabase start

# Retrieve keys in JSON format and copy to .env.local:
#   pnpm supabase status -o json
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLISHABLE_KEY from JSON output>
#   SUPABASE_SERVICE_ROLE_KEY=<SECRET_KEY from JSON output>

# Run migrations
pnpm db:run-migrate

# Stop Supabase local
pnpm supabase stop
```

> These keys are also visible in the human-readable `pnpm supabase start` output under "Authentication Keys" (Publishable / Secret).

- **Supabase Studio**: http://127.0.0.1:54323
- **Mailpit (email testing)**: http://127.0.0.1:54324
- **PostgreSQL**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **API**: http://127.0.0.1:54321

`psql` is not necessarily on PATH; `docker exec -it <container> psql -U postgres` against the Supabase database container (find its name with `docker ps`) works without it.

### Changing the local ports

The ports above are the Supabase CLI defaults, which every other project on
the machine that uses Supabase also starts on, so only one of them can run at
a time. They are set in `supabase/config.toml` (`[api]`, `[db]`, `[db.pooler]`,
`[studio]`, `[local_smtp]`, `[analytics]`, plus `shadow_port` and the edge
runtime's `inspector_port`), and the CLI binds whatever that file says. To move
this project to other ports:

1. Change them in `supabase/config.toml`.
2. Run `pnpm test` from `apps/web`. `src/lib/local-supabase.test.ts` fails for
   each code copy of `[api] port` / `[db] port` that no longer matches:
   `src/lib/local-supabase.ts` (the web app's fallbacks) and
   `LOCAL_SUPABASE_API_PORT` in `apps/mobile/src/auth/config.ts` (the mobile
   app's development default). Update those.
3. Update the connection variables in your `.env.local` and in `.env.example`.
4. Register the new Auth callback (`http://127.0.0.1:<api port>/auth/v1/callback`)
   in Google Cloud Console if you use Google sign-in locally.
5. Restart: `pnpm supabase stop && pnpm supabase start`.

The local pool size does not depend on the ports: `resolvePoolMax` in
`src/lib/db/pooler-mode.ts` tells the local pooler from a direct connection by
the pooler's tenant-qualified user name. The concrete ports in the rest of
these docs are the current values, kept for copy-paste; update them in the
same change.

### Google OAuth (optional)

To test Google login locally, set up credentials in `supabase/.env`:

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Copy `supabase/.env.example` to `supabase/.env` and fill in the values

The redirect URI to register and the production counterpart are in the README's "Local Development" section and in [authentication-setup.md](authentication-setup.md).

## Database migrations

- **Always use `pnpm db:run-migrate`** — This runs `scripts/migrate.ts`, which executes Drizzle migrations and then applies Supabase-specific SQL (RLS policies, auth hook, profiles setup, storage avatars) in Supabase environments (both local and production).
- **Do NOT use `drizzle-kit push`** — `push` bypasses migration tracking (`drizzle.__drizzle_migrations`) and directly syncs the schema to the DB. This causes the migration journal and actual DB state to diverge, leading to errors on subsequent `migrate` runs.
- **Schema changes workflow**: Edit the table's file under `src/lib/db/schema/` (one file per domain: `ranks.ts`, `posts.ts`, …; `src/lib/db/schema.ts` is only a re-export) → run `npx drizzle-kit generate --name=<migration_name>` → run `pnpm db:run-migrate`.
- **Always specify `--name` when generating migrations** — Running `drizzle-kit generate` without `--name` produces opaque sequential filenames. Always provide a descriptive name so the migration's purpose is clear from the filename alone.
  - Use **snake_case** and keep the name concise (e.g., `create_games_table`, `add_visibility_to_announcements`)
  - The prefix is configured as **timestamp format** (`20240627123900_create_games_table.sql`) in `drizzle.config.ts` to avoid conflicts between branches. Do not change this to sequential index format (`0001_`, `0002_`, ...).
  ```bash
  npx drizzle-kit generate --config drizzle.config.ts --name=create_games_table
  ```
  - `drizzle-kit generate` asks interactively whether a changed column is a rename; in a non-TTY session that prompt fails. Generate a column add and the old column's removal as two migrations when that happens.
- **Migration file structure**:
  - `drizzle/*.sql` + `drizzle/meta/` — Drizzle-managed migrations (auto-generated, tracked by journal). The `meta/` snapshots are listed in the repo-root `.ignore` so they do not swamp search results.
  - `drizzle/supabase/` — Supabase-specific SQL (RLS, auth hooks, permissions, pg_cron scheduled jobs). Applied by `migrate.ts` in Supabase environments (detected by presence of `supabase_auth_admin` role). Each file must be idempotent — the whole set is re-applied on every migrate. Recurring DB maintenance (retention cleanups etc.) belongs in `scheduled_jobs.sql`: `cron.schedule()` upserts by job name, so editing a job there and re-running migrate updates it in place.
- After a schema change, delete `apps/web/tsconfig.tsbuildinfo` before `pnpm typecheck` if it reports errors that the editor does not; a stale build-info file keeps old declarations.
