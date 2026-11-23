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

The ports above are the Supabase CLI defaults. Every other project on the
machine that uses Supabase starts on them too, so only one such project can
run at a time. Give each project its own block and keep the last two digits
of the defaults, so the role of a port stays readable (`…21` is always the
API, `…22` always Postgres):

| Port                  | `config.toml`                   | Default | Example block (`553xx`) |
| --------------------- | ------------------------------- | ------- | ----------------------- |
| API (auth, REST)      | `[api] port`                    | 54321   | 55321                   |
| Postgres (direct)     | `[db] port`                     | 54322   | 55322                   |
| Shadow database       | `[db] shadow_port`              | 54320   | 55320                   |
| Supavisor pooler      | `[db.pooler] port`              | 54329   | 55329                   |
| Studio                | `[studio] port`                 | 54323   | 55323                   |
| Mailpit               | `[local_smtp] port`             | 54324   | 55324                   |
| Analytics             | `[analytics] port`              | 54327   | 55327                   |
| Edge runtime debugger | `[edge_runtime] inspector_port` | 8083    | 8183                    |

Move all eight. One left on its default still collides with the other
project and makes `supabase start` fail on that port.

`config.toml` decides where the stack listens; `.env.local` only tells the
app where to connect. Changing one without the other leaves the app knocking
on a port nothing listens on. Steps, from `apps/web`:

1. **Stop the stack first**, while `config.toml` still has the old ports:
   `pnpm supabase stop`.
2. **`supabase/config.toml`:** change the eight ports in the table.
3. **Code copies:** run `pnpm test`. `src/lib/local-supabase.test.ts` fails
   for each copy of `[api] port` / `[db] port` that no longer matches. Update
   `LOCAL_SUPABASE_API_PORT` / `LOCAL_SUPABASE_DB_PORT` in
   `src/lib/local-supabase.ts` and `LOCAL_SUPABASE_API_PORT` in
   `apps/mobile/src/auth/config.ts`, then rerun until it passes.
4. **`.env.local` and `.env.example`:** change the port in each of these
   (no other variable carries a local port):

   | Variable                   | Port               |
   | -------------------------- | ------------------ |
   | `NEXT_PUBLIC_SUPABASE_URL` | `[api] port`       |
   | `DATABASE_URL`             | `[db] port`        |
   | `POSTGRES_URL_NON_POOLING` | `[db.pooler] port` |

5. **Google Cloud Console** (only if you use Google sign-in locally): add
   `http://127.0.0.1:<api port>/auth/v1/callback` to the OAuth client's
   Authorized redirect URIs. Keep the old one until nobody uses the old port.
6. **Start and check:** `pnpm supabase start`, then `pnpm supabase status`
   lists the ports actually bound; they should match the table.
7. **Recreate the data if it is gone:** the new stack may come up with an
   empty database. Run `pnpm db:run-migrate`, `pnpm db:seed` and
   `pnpm db:seed:dev`.
8. **Restart `next dev`** so it rereads `.env.local`. Studio and Mailpit are
   now on their new ports (`http://127.0.0.1:<studio port>`,
   `http://127.0.0.1:<mailpit port>`).

The mobile app needs nothing more: in development it builds its Supabase URL
from the constant updated in step 3. Only a Metro started with
`EXPO_PUBLIC_SUPABASE_URL` set by hand (the `--tunnel` case in
`apps/mobile/README.md`) needs the new port in that variable.

The local pool size does not depend on the ports: `resolvePoolMax` in
`src/lib/db/pooler-mode.ts` tells the local pooler from a direct connection by
the pooler's tenant-qualified user name.

When the change is committed rather than made on one machine, also update the
ports written out for copy-paste in: `apps/web/README.md`,
`apps/web/docs/{local-development,authentication-setup,environment-variables,admin-panel-setup,resend-smtp-setup,preview-deployments,deployment}.md`,
`apps/mobile/README.md`, `apps/web/.claude/skills/verify/SKILL.md`,
`.claude/skills/parallel-worktree/SKILL.md` and the summaries printed by
`scripts/claude-cloud/{session-start,stack-up}.sh`. `git grep -nE "5432[0-9]"`
finds them; the `54322` in `resolvePoolMax`'s TSDoc records a past
measurement and stays.

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
