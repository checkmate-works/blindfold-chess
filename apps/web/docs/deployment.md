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

### Setup via Vercel Marketplace (Recommended)

1. Go to Vercel Dashboard → Your Project → Settings → Integrations → Browse Marketplace
2. Search for "Supabase" and click Add Integration
3. Connect your Supabase account and select or create a project
4. Environment variables (`POSTGRES_URL`, etc.) will be automatically synced

The application automatically uses `POSTGRES_URL` when available.

### Manual Setup

1. Create a project at [supabase.com](https://supabase.com/)
2. Go to Project Settings → Database → Connection string
3. Copy the connection string and add it to Vercel Environment Variables as `DATABASE_URL`

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

### Migrations deliberately run over the pooled connection, not Direct

`scripts/migrate.ts` and `drizzle.config.ts` both fall back through
`POSTGRES_URL_NON_POOLING || POSTGRES_URL || DATABASE_URL`, but
`POSTGRES_URL_NON_POOLING` (Supabase's Direct connection) is intentionally
**left out of `turbo.json`'s `build` task `passThroughEnv`**, so it never
reaches the build process and migrations always run over the pooled
`POSTGRES_URL` instead.

This is a deliberate workaround, not an oversight: this project's Supabase
Direct connection endpoint is IPv6-only (no IPv4 add-on purchased), and
Vercel's build containers have no outbound IPv6 route. Allow-listing
`POSTGRES_URL_NON_POOLING` made migrations pick that endpoint and fail the
build with `ENETUNREACH` (2026-07-18). The pooled connection has run every
migration this app has (Drizzle migrations + all of `drizzle/supabase/*.sql`)
without incident, so this is safe as-is — but see
[#94](https://github.com/checkmate-works/blindfold-chess/issues/94) before
re-adding `POSTGRES_URL_NON_POOLING` here: it documents the two ways to make
Direct (or Session-pooler) connections work if a future migration needs
session-level guarantees the Transaction-mode pooler can't give (e.g.
`CREATE INDEX CONCURRENTLY`, advisory locks spanning multiple statements).
