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

- **Supabase Studio**: http://127.0.0.1:55323
- **Mailpit (email testing)**: http://127.0.0.1:55324
- **PostgreSQL**: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`
- **API**: http://127.0.0.1:55321

`psql` is not necessarily on PATH; `docker exec -it <container> psql -U postgres` against the Supabase database container (find its name with `docker ps`) works without it.

### Local ports

This project does not use the Supabase CLI's default ports. Every other
project on the machine that uses Supabase starts on the defaults, so only one
of them could run at a time. This one uses its own `553xx` block instead,
keeping the last two digits of the defaults so a port's role stays readable
(`…21` is always the API, `…22` always Postgres). Another project can take
`563xx` the same way.

| Port                  | `config.toml`                   | This project | CLI default |
| --------------------- | ------------------------------- | ------------ | ----------- |
| API (auth, REST)      | `[api] port`                    | 55321        | 54321       |
| Postgres (direct)     | `[db] port`                     | 55322        | 54322       |
| Shadow database       | `[db] shadow_port`              | 55320        | 54320       |
| Supavisor pooler      | `[db.pooler] port`              | 55329        | 54329       |
| Studio                | `[studio] port`                 | 55323        | 54323       |
| Mailpit               | `[local_smtp] port`             | 55324        | 54324       |
| Analytics             | `[analytics] port`              | 55327        | 54327       |
| Edge runtime debugger | `[edge_runtime] inspector_port` | 8183         | 8083        |

`config.toml` decides where the stack listens; `.env.local` only tells the
app where to connect. Three variables carry a local port, and nothing else
does:

| Variable                   | Port               | Local value                                                          |
| -------------------------- | ------------------ | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` | `[api] port`       | `http://127.0.0.1:55321`                                             |
| `DATABASE_URL`             | `[db] port`        | `postgresql://postgres:postgres@127.0.0.1:55322/postgres`            |
| `POSTGRES_URL_NON_POOLING` | `[db.pooler] port` | `postgresql://postgres.pooler-dev:postgres@127.0.0.1:55329/postgres` |

#### Moving an existing checkout to these ports

A `.env.local` written before the move still points at the defaults. Once,
from `apps/web`:

1. `pnpm supabase stop`, if the stack is running.
2. In `.env.local`, set the three variables above to their local values.
3. If you use Google sign-in locally, add
   `http://127.0.0.1:55321/auth/v1/callback` to the OAuth client's
   Authorized redirect URIs in Google Cloud Console.
4. `pnpm supabase start`, then `pnpm supabase status`: the ports it lists
   should match the table.
5. If the database came up empty, run `pnpm db:run-migrate`, `pnpm db:seed`
   and `pnpm db:seed:dev`.
6. Restart `next dev` so it rereads `.env.local`.

The mobile app needs nothing: in development it builds its Supabase URL from
`LOCAL_SUPABASE_API_PORT` in `apps/mobile/src/auth/config.ts`. Only a Metro
started with `EXPO_PUBLIC_SUPABASE_URL` set by hand (the `--tunnel` case in
`apps/mobile/README.md`) needs the new port in that variable.

#### Changing the block again

1. Change all eight ports in `supabase/config.toml`. One left behind still
   collides with the other project.
2. Run `pnpm test`. `src/lib/local-supabase.test.ts` fails for each code copy
   of `[api] port` / `[db] port` that no longer matches:
   `LOCAL_SUPABASE_API_PORT` / `LOCAL_SUPABASE_DB_PORT` in
   `src/lib/local-supabase.ts` and `LOCAL_SUPABASE_API_PORT` in
   `apps/mobile/src/auth/config.ts`. Update them until it passes.
3. Update the local values in the table above and in `.env.example`.
4. Update the ports written out for copy-paste in `apps/web/README.md`,
   `apps/web/docs/{local-development,authentication-setup,environment-variables,admin-panel-setup,resend-smtp-setup,preview-deployments,deployment}.md`,
   `apps/mobile/README.md`, `apps/web/.claude/skills/verify/SKILL.md`,
   `.claude/skills/parallel-worktree/SKILL.md` and the summaries printed by
   `scripts/claude-cloud/{session-start,stack-up}.sh`;
   `git grep -nE "5532[0-9]"` finds them. Test inputs in `pooler-mode.test.ts`
   and `csp.test.ts` are arbitrary examples and can stay, and so can the
   `54322` in `resolvePoolMax`'s TSDoc, which records a past measurement.
5. Then follow "Moving an existing checkout" above.

The local pool size does not depend on the ports: `resolvePoolMax` in
`src/lib/db/pooler-mode.ts` tells the local pooler from a direct connection by
the pooler's tenant-qualified user name.

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
