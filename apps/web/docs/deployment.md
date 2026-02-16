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
