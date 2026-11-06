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
