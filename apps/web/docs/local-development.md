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

### Dev server (Next): chess.localhost:3100

`pnpm dev` does not listen on Next's default 3000. It listens on **3100**,
and the browser opens **http://chess.localhost:3100**. The port follows the same rule as the
Supabase block: keep the default's last two digits and let the higher digits
name the project, so another project on the machine takes 3200.

The host is separate too, not only the port, because of cookies:

- Cookies are scoped by host and not by port. `localhost:3100` and
  `localhost:3200` share one cookie jar.
- supabase-js names its login cookie after the first label of the Supabase
  URL's host. Every local stack is at `127.0.0.1`, so the cookie is
  `sb-127-auth-token` in every project, and signing in to one project on
  plain `localhost` overwrites the other's session.
- Browsers resolve every `*.localhost` name to loopback themselves, so
  `chess.localhost` needs no `/etc/hosts` entry and no external DNS name such
  as `lvh.me`.
- Next 16's dev server allows dev resources (HMR, `/_next/*`) from
  `**.localhost` by default (`blockCrossSiteDEV` in
  `next/dist/server/lib/router-utils/block-cross-site-dev.js`, checked on
  16.4.6), so `allowedDevOrigins` needs no entry for it.
- A host name alone would not be enough: only one process can listen on a
  port, so the ports differ as well.

| Where                                                | Value                                                 |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `dev` script in `apps/web/package.json`              | `next dev --turbopack -p 3100` (decides the port)     |
| `[auth] site_url` in `supabase/config.toml`          | `http://chess.localhost:3100` (decides the origin)    |
| `[auth] additional_redirect_urls`                    | includes `site_url`                                   |
| `NEXT_PUBLIC_SITE_URL` in `.env.local`               | `http://chess.localhost:3100`                         |
| `LOCAL_WEB_PORT` in `apps/mobile/src/auth/config.ts` | `3100`; the host stays the Metro host, or `localhost` |
| `web` in `.claude/launch.json`                       | `port: 3100`, `url: http://chess.localhost:3100`      |
| `APP_URL` in `scripts/claude-cloud/config.sh`        | `http://localhost:3100`                               |

The mobile app and the cloud VM keep a plain host on purpose. The app sends
no cookies, and a phone cannot resolve `chess.localhost` to the development
machine; it reaches the server at the machine's LAN address
(`192.168.x.x:3100`). That is also why the `dev` script has no `-H`: the
server has to listen on every interface. The cloud VM runs only this project,
and `curl` / Node on Linux do not reliably resolve `*.localhost`. For the same
reason anything that sends no cookies, such as `stripe listen --forward-to`
or a `curl` against a cron route, can use `localhost:3100`.

Code that asks "is this site URL local?" must accept `*.localhost`:
`isLoopbackHostname` in `src/lib/loopback-host.ts` is the one place that
decides it (`IS_LOCAL_DEV` uses it for the cookies' `Secure` attribute).

#### Moving an existing checkout to chess.localhost:3100

A `.env.local` written before the move still says `localhost:3000`. Once,
from `apps/web`:

1. In `.env.local`, set `NEXT_PUBLIC_SITE_URL=http://chess.localhost:3100`.
2. If you use Google sign-in locally, add `http://chess.localhost:3100` to the OAuth
   client's Authorized JavaScript origins in Google Cloud Console. If the
   console refuses the value, leave it out: the redirect-based sign-in does
   not depend on it (see [authentication-setup.md](authentication-setup.md)).
3. `pnpm supabase stop`, then `pnpm supabase start`, so Auth rereads
   `site_url` and `additional_redirect_urls` (the database is kept).
4. Restart `next dev` and open http://chess.localhost:3100.
5. Sign in again. The session cookie of the old origin (`localhost:3000`)
   does not carry over to the new host.

#### Changing the port or the host again

1. Change the two deciding values: the `-p` in the `dev` script and
   `site_url` in `supabase/config.toml`.
2. Run `pnpm test`. `src/lib/local-web-server.test.ts` fails for each copy
   that no longer matches (the remaining rows of the table, except
   `.env.local`, which is gitignored). Update them until it passes.
3. Update what is written out for copy-paste; `git grep -nE
"chess\.localhost|:3100"` finds it (`README.md`, `apps/web/README.md`,
   `apps/web/docs/`, `apps/mobile/README.md`,
   `apps/web/.claude/skills/verify/SKILL.md`,
   `.claude/skills/parallel-worktree/SKILL.md`). The `localhost:3000` in test
   inputs (`auth/callback/route.test.ts`, the proxy tests) is an arbitrary
   example and can stay.
4. Then follow "Moving an existing checkout" above.

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
