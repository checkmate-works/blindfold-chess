# Blindfold Chess

Free online platform to practice blindfold chess.

## Quick Start

### Prerequisites

- Node.js 24.x
- pnpm 10.x
- Docker (required by Supabase CLI)
- [Supabase CLI](https://supabase.com/docs/guides/local-development)

### Setup

```bash
# Install dependencies (from monorepo root)
pnpm install

# Copy Stockfish AI engine files (required for AI opponent)
pnpm run copy-stockfish

# Start Supabase local (first run downloads Docker images)
supabase start
```

After `supabase start` completes, retrieve the API keys by running `supabase status -o json`. Copy these values into `.env.local`:

```bash
supabase status -o json
cp .env.example .env.local
```

| `supabase status -o json` field | `.env.local` variable           | Notes                                         |
| ------------------------------- | ------------------------------- | --------------------------------------------- |
| `PUBLISHABLE_KEY`               | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key used by the browser client         |
| `SECRET_KEY`                    | `SUPABASE_SERVICE_ROLE_KEY`     | Secret key for server-side operations         |
| `API_URL`                       | `NEXT_PUBLIC_SUPABASE_URL`      | Already defaulted to `http://127.0.0.1:54321` |

> **Tip:** These values are also visible in the `supabase start` output under "Authentication Keys" (Publishable / Secret) and "APIs" (Project URL).

```bash
# Apply database schema
pnpm db:run-migrate

# Seed initial data (categories)
pnpm db:seed

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local Development

### Google OAuth Setup (for Google Sign-In)

To test Google Sign-In locally, you need to configure OAuth credentials:

1. **Create OAuth credentials** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Go to **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**
   - Select **Web application** as the application type

2. **Register redirect URIs** in Google Cloud Console:

   | Field                         | Value                                     |
   | ----------------------------- | ----------------------------------------- |
   | Authorized JavaScript origins | `http://localhost:3000`                   |
   | Authorized redirect URIs      | `http://127.0.0.1:54321/auth/v1/callback` |

   > **Note:** The redirect URI points to the local Supabase Auth endpoint, not your Next.js app. For production, the redirect URI is `https://<reference-id>.supabase.co/auth/v1/callback` (see [authentication-setup.md](docs/authentication-setup.md)).

3. **Configure Supabase environment**:

   ```bash
   cp supabase/.env.example supabase/.env
   ```

   Edit `supabase/.env` and fill in the values from the Google Cloud Console:
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` — your OAuth Client ID
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` — your OAuth Client Secret

4. **Restart Supabase** to pick up the new environment variables:
   ```bash
   supabase stop && supabase start
   ```

For detailed authentication documentation, see [docs/authentication-setup.md](docs/authentication-setup.md).

### Local Test Data

For UI verification that depends on populated data (e.g. the practice leaderboard preview), seed predictable fixtures into local Supabase:

```bash
pnpm db:seed:dev
```

This creates 5 test users (`alice`/`bob`/`carol`/`dave`/`eve` @ `example.local`, password `dev-password`) and inserts `challenge_results` + `challenge_best_scores` rows distributed over the past 30 days, exercising both the weekly and all-time leaderboards. The script is idempotent (re-runs replace seed-user rows only) and refuses to run against any non-local DB or Supabase URL.

This is intentionally separate from `pnpm db:seed`, which seeds master data (ranks, glossary, etc.) and runs in production as well.

### Local Services

- **Supabase Studio**: http://127.0.0.1:54323
- **Inbucket (email testing)**: http://127.0.0.1:54324
- **PostgreSQL**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

To stop Supabase:

```bash
supabase stop
```

## Deployment

Deployment guide for Vercel and Supabase, including monorepo Root Directory configuration and region selection.

See [docs/deployment.md](docs/deployment.md) for details.

## Environment Variables

Configuration for site URL, database connection, Google Analytics, cookie consent banner, Sentry error tracking, and contact form (Resend).

See [docs/environment-variables.md](docs/environment-variables.md) for details.

## Authentication

User authentication via Supabase Auth with Google Sign-In (Apple Sign-In planned). Enables cross-platform account sharing between web, mobile, and desktop apps.

See [docs/authentication-setup.md](docs/authentication-setup.md) for setup instructions.

## Email (SMTP)

Production email delivery for Supabase Auth using Resend as the custom SMTP provider. Covers domain verification, SMTP credentials, Dashboard configuration, and email template setup.

See [docs/resend-smtp-setup.md](docs/resend-smtp-setup.md) for setup instructions.

## Admin Panel

Internal admin dashboard at `/admin` with Role-Based Access Control (RBAC). Requires Supabase Auth, a `user_roles` database table, and a Custom Access Token Hook.

See [docs/admin-panel-setup.md](docs/admin-panel-setup.md) for setup instructions.

## Avatar Storage

Profile avatar image upload using Supabase Storage. Requires a storage bucket with RLS policies.

See [docs/avatar-storage-setup.md](docs/avatar-storage-setup.md) for setup instructions.

## Subscription / Billing

Stripe-based subscription billing ($1/month ad-free plan). Covers API keys, Product/Price creation, Webhook setup, Customer Portal, and environment variables.

See [docs/stripe-setup.md](docs/stripe-setup.md) for setup instructions.

## Cron Jobs

Monthly leaderboard badges are granted automatically via a Vercel Cron Job.

- **Schedule:** Every 1st of the month at UTC 01:00 (JST 10:00)
- **Endpoint:** `/api/cron/grant-monthly-leaderboard-badges`
- **Configuration:** `vercel.json` (`crons` field)

The route handler authenticates incoming requests by comparing the `Authorization: Bearer <token>` header against `process.env.CRON_SECRET`. Vercel Cron Jobs automatically attach this header when a `CRON_SECRET` environment variable exists on the project, but **the value itself is not auto-generated — you must create and set it yourself**.

### Setting up `CRON_SECRET`

1. Generate a strong random secret locally:

   ```bash
   openssl rand -base64 32
   ```

   (or `openssl rand -hex 32` / `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)

2. Register it on Vercel in the **Production** environment (at minimum). Either from the dashboard (Settings > Environment Variables) or via CLI:

   ```bash
   cd apps/web
   vercel env add CRON_SECRET production
   # paste the generated value when prompted
   ```

3. Redeploy so the new environment variable takes effect.

4. (Optional) Pull it into local `.env.local` for manual testing:

   ```bash
   vercel env pull .env.local
   ```

### Post-deploy checklist

After deploying, verify the following in the Vercel dashboard:

1. **Settings > Cron Jobs** - Confirm the job is registered and shows the correct schedule
2. **Settings > Environment Variables** - Confirm `CRON_SECRET` exists in the Production environment. If it is missing, all cron invocations will fail with `401 Unauthorized`.

## Available Scripts

Standard scripts (`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm test`) work as expected. Below are project-specific scripts worth noting:

- `pnpm run copy-stockfish` - Copy Stockfish AI engine files to public directory (required before first run)
- `pnpm db:seed` - Seed master data (ranks, glossary, etc.). Runs in production too
- `pnpm db:seed:dev` - Seed local-only fixtures (test users + challenge results). Refuses to run against non-local hosts
- `npx drizzle-kit generate --name=<migration_name>` - Generate migrations from schema changes (always specify `--name`)
- `pnpm db:run-migrate` - Run migrations + Supabase SQL (auto-detects Supabase)
- `pnpm db:studio` - Open Drizzle Studio (database GUI)
- `pnpm test:run` - Run unit tests once (CI mode)
- `pnpm test:e2e` - Run E2E tests in headless mode (auto-starts dev server)
- `pnpm capture-screenshots` - Capture practice page thumbnails for the practice menu

## Data Backfill

- `scripts/backfill-feed-items.sql` - Backfill `feed_items` from existing `topic_posts` for the home timeline. Run manually in Supabase SQL Editor after deploying the `feed_items` table migration. Idempotent (safe to run multiple times).

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- React 19
- Drizzle ORM
- PostgreSQL (Supabase)
- Playwright (E2E Testing)
- Vitest (Unit Testing)

## Practice Screenshots

Thumbnail screenshots for the practice menu page, including capture setup, script usage, and how to add new practices.

See [docs/practice-screenshots.md](docs/practice-screenshots.md) for details.

## Release Process

Automates release note generation, git tagging, and SQL output using the Claude Code `/web-release-notes` skill.

See [docs/release-process.md](docs/release-process.md) for details.

## License

MIT
