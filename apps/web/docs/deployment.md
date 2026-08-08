# Deployment

## Vercel

When deploying to Vercel, you must configure the **Root Directory** in the project settings.

- **Root Directory**: `apps/web`
- **Include files outside of the root directory in the build step**: **Yes** (Check this option)
- **Install Command**: `cd ../.. && pnpm install` (Override default)
- **Build Command**: `next build` (default) or `cd apps/web && pnpm build`
- **Output Directory**: `.next` (default)

The project is structured as a monorepo using Turborepo. Vercel automatically detects Turborepo, but specifying the Root Directory ensures the correct context for the Next.js application.

## Database (Supabase)

For production, we recommend using [Supabase](https://supabase.com/) as the PostgreSQL database provider.

### Setup: connect from the Supabase side

This project's production database credentials are **synced by the
Supabase–Vercel integration, and are not maintained by hand**. The integration
is set up from Supabase, not from Vercel:

1. Open the Supabase Dashboard and switch to the **organization** view (not a
   single project).
2. Choose **Integrations** in the sidebar — the URL looks like
   `https://supabase.com/dashboard/org/<org-id>/integrations`.
3. Pick the Vercel integration and connect it, then choose which Supabase
   project pairs with which Vercel project.

Supabase then writes the connection variables into the Vercel project and keeps
them current, including `POSTGRES_URL` (Supavisor transaction pooler, port
6543), `POSTGRES_URL_NON_POOLING` (Supavisor session pooler, port 5432), and
the `NEXT_PUBLIC_SUPABASE_*` / service-role keys.

**Do not set these by hand in Vercel.** A manually entered value shadows the
synced one, so it silently stops tracking credential rotation and pooler
endpoint changes — which breaks a connection that currently works, at some
later date, for no visible reason. If an experiment needs a different runtime
endpoint, use `DB_RUNTIME_URL` (see below), which is read only at runtime and
leaves the synced variables untouched.

### Which connection the app uses

| Context                            | Variable                                                 | Endpoint                      |
| ---------------------------------- | -------------------------------------------------------- | ----------------------------- |
| Runtime queries (server rendering) | `POSTGRES_URL_NON_POOLING`                               | Session pooler, port 5432     |
| Build-time queries and migrations  | `POSTGRES_URL`                                           | Transaction pooler, port 6543 |
| Local development                  | none set — the loopback default in `src/lib/db/index.ts` | Local Supabase, port 54322    |

Runtime deliberately uses the **session** pooler: under the transaction pooler
this app hit queries that vanished on established connections — no answer, no
error — and switching modes ended it. The `USE_SESSION_POOLER` TSDoc in
`src/lib/db/index.ts` carries the full reasoning and is the one-line switch
back. Note the cost of session mode: concurrent connections are capped by the
pooler's **Pool Size** (Supabase Dashboard → Database → Connection pooling) and
exceeding it fails fast with `EMAXCONNSESSION` rather than queuing, so that
budget has to cover the pool `max` times the number of concurrently warm
Vercel instances.

`DB_RUNTIME_URL` overrides the runtime endpoint when set, and is normally
unset. It exists for one-off experiments; build-time scripts ignore it.

### Region Selection for Optimal Latency

To minimize latency between Vercel Functions and Supabase database:

| Service          | Recommended Region                 |
| ---------------- | ---------------------------------- |
| Vercel Functions | `iad1` (US East - Washington D.C.) |
| Supabase         | East US (North Virginia)           |

Both services should be in the same region (US East) for optimal performance.

**Vercel Region Configuration:**

- Go to Vercel Dashboard → Project → Settings → Functions
- Set the region to `iad1` (Washington, D.C., USA)

### Why the build sees only the transaction pooler

`scripts/migrate.ts` and `drizzle.config.ts` both fall back through
`POSTGRES_URL_NON_POOLING || POSTGRES_URL || DATABASE_URL`, and
`POSTGRES_URL_NON_POOLING` is deliberately **left out of `turbo.json`'s
`build` task env**. Turborepo's strict environment mode therefore strips it
from the build, so migrations — and the build-time queries in
`generateStaticParams` — always take `POSTGRES_URL`.

The exclusion was added because allow-listing that variable failed the build
with `ENETUNREACH` (2026-07-18): it then resolved to Supabase's Direct
endpoint, which is IPv6-only for this project (no IPv4 add-on) while Vercel's
build containers have no outbound IPv6 route. It resolves to the session
pooler today — the runtime `db.pooler_mode` tag in Sentry reports `session`,
which is derived from the URL's host — so that specific failure would probably
not recur, but the exclusion is kept: the build has no reason to want session
semantics, and the transaction pooler has run every migration this app has
(Drizzle migrations plus all of `drizzle/supabase/*.sql`) without incident.

See [#94](https://github.com/checkmate-works/blindfold-chess/issues/94) before
changing this. It documents how to make Direct or session-pooler connections
work from the build if a migration ever needs session-level guarantees the
transaction pooler cannot give — `CREATE INDEX CONCURRENTLY`, or advisory
locks spanning multiple statements.
