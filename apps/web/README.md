# Blindfold Chess

Free online platform to practice blindfold chess.

## Quick Start

### Prerequisites

- Node.js 24.x
- pnpm 10.x

### Installation

```bash
# Install dependencies (run from monorepo root)
pnpm install

# Copy Stockfish AI engine files (required for AI opponent)
# Run inside apps/web directory
pnpm run copy-stockfish

# Start development server
# Can be run from root (pnpm dev) or inside apps/web
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local Development

### Posts Feature Setup

The Posts feature requires a PostgreSQL database. For local development, use Docker Compose:

```bash
# Start PostgreSQL container
docker compose up -d

# Apply database schema
pnpm db:push

# Seed initial data (categories)
pnpm db:seed
```

The default database connection is `postgresql://postgres:postgres@localhost:5432/blindfold_chess`. No `.env.local` configuration is required for local development.

To stop the database:

```bash
docker compose down

# To also remove the data volume:
docker compose down -v
```

## Deployment

### Vercel

When deploying to Vercel, you must configure the **Root Directory** in the project settings.

- **Root Directory**: `apps/web`
- **Include files outside of the root directory in the build step**: **Yes** (Check this option)
- **Install Command**: `cd ../.. && pnpm install` (Override default)
- **Build Command**: `next build` (default) or `cd apps/web && pnpm build`
- **Output Directory**: `.next` (default)

The project is structured as a monorepo using Turborepo. Vercel automatically detects Turborepo, but specifying the Root Directory ensures the correct context for the Next.js application.

### Database (Supabase)

For production, we recommend using [Supabase](https://supabase.com/) as the PostgreSQL database provider.

#### Setup via Vercel Marketplace (Recommended)

1. Go to Vercel Dashboard → Your Project → Settings → Integrations → Browse Marketplace
2. Search for "Supabase" and click Add Integration
3. Connect your Supabase account and select or create a project
4. Environment variables (`POSTGRES_URL`, etc.) will be automatically synced

The application automatically uses `POSTGRES_URL` when available.

#### Manual Setup

1. Create a project at [supabase.com](https://supabase.com/)
2. Go to Project Settings → Database → Connection string
3. Copy the connection string and add it to Vercel Environment Variables as `DATABASE_URL`

#### Region Selection for Optimal Latency

To minimize latency between Vercel Functions and Supabase database:

| Service          | Recommended Region                 |
| ---------------- | ---------------------------------- |
| Vercel Functions | `iad1` (US East - Washington D.C.) |
| Supabase         | East US (North Virginia)           |

Both services should be in the same region (US East) for optimal performance.

**Vercel Region Configuration:**

- Go to Vercel Dashboard → Project → Settings → Functions
- Set the region to `iad1` (Washington, D.C., USA)

## Environment Variables

Copy the example environment file and update as needed:

```bash
cp .env.example .env.local
```

### Configuration Options

#### Site Configuration

```bash
# Base URL for your site (required for sitemap generation)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

#### Database (Required for Posts Feature)

```bash
# PostgreSQL connection string
# Vercel Marketplace: POSTGRES_URL is automatically set by Supabase integration
# Manual setup: Use DATABASE_URL with your connection string
# Local development: Leave unset (defaults to local docker-compose PostgreSQL)
#
# The application checks in order: POSTGRES_URL → DATABASE_URL → default
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

#### Google Analytics (Optional)

The application supports Google Analytics 4 for usage tracking. To enable it:

1. Create a Google Analytics 4 property at [analytics.google.com](https://analytics.google.com/)
2. Get your Measurement ID (format: G-XXXXXXXXXX)
3. Add to your `.env.local` file:

```bash
# Google Analytics Measurement ID
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

#### Cookie Consent Banner (Required for EU/US users and AdSense)

The application uses CookieYes, a Google-certified Consent Management Platform (CMP) for GDPR/CCPA compliance. This is **required** for Google AdSense approval.

**Setup Instructions:**

1. **Create a CookieYes Account**
   - Go to [cookieyes.com](https://www.cookieyes.com/)
   - Sign up for free (no credit card required)
   - Free plan: Up to 25,000 page views/month

2. **Add Your Website**
   - Click "Add Website"
   - Enter your website URL
   - Select default language: **English**
   - Choose plan: **Free**

3. **Configure Cookie Banner**
   - Select cookie categories: Necessary, Analytics, Advertisement
   - Cookie scanner will auto-detect Google Analytics and AdSense
   - Customize banner design (optional)
   - Enable **Google Consent Mode v2** (Settings → Integrations)
   - Select **"Advanced Implementation"** for AdSense

4. **Configure Multi-Language (English + Japanese)**
   - Go to Settings → Languages → Add Language → Japanese
   - Manually translate banner text to Japanese
   - The banner will automatically switch based on page URL (`/en` or `/ja`)

5. **Get Your CookieYes ID**
   - Go to Settings → Install on Website
   - Select **"Manual Installation"** (not Google Tag Manager)
   - Copy the ID from the script URL (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

6. **Add to Environment Variables**

   ```bash
   # CookieYes ID from dashboard
   NEXT_PUBLIC_COOKIEYES_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

7. **Publish the Banner**
   - In CookieYes dashboard, click **"Publish"** or **"Activate Banner"**
   - Without publishing, the banner won't appear even with correct ID

**Important Notes:**

- Multi-language support works on the free plan (language detection from HTML `lang` attribute)
- Google Consent Mode v2 integration is automatic
- Required for Google AdSense approval and GDPR/CCPA compliance
- For detailed setup instructions, see `docs/COOKIE_CONSENT_SETUP.md`

#### Error Tracking (Optional)

The application supports Sentry for error tracking in production. To enable it:

1. Create a free account at [Sentry.io](https://sentry.io/)
2. Create a new project
3. Add the following environment variables:

```bash
# Sentry DSN for error tracking
# Get from: Sentry Dashboard → Settings → Projects → [Your Project] → Client Keys (DSN)
NEXT_PUBLIC_SENTRY_DSN=your-dsn-here

# For uploading source maps (improves error stack traces)
# Get from: Sentry Dashboard → Settings → Auth Tokens
SENTRY_AUTH_TOKEN=your-auth-token

# Required only if using SENTRY_AUTH_TOKEN
# Found in your Sentry project settings
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-name
```

**Note:** Error tracking is automatically disabled in development. Only `NEXT_PUBLIC_SENTRY_DSN` is required for basic error tracking. The auth token and related settings are optional but recommended for better debugging experience.

#### Contact Form Email (Optional)

The application includes a contact form that uses [Resend](https://resend.com/) to send emails. To enable the contact form:

1. Create a free account at [resend.com](https://resend.com/)
2. Verify your domain or use the testing domain provided by Resend
3. Generate an API key from the Resend dashboard
4. Add the following environment variables:

```bash
# Resend API Key
# Get from: Resend Dashboard → API Keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email address to send contact form emails FROM
# Must be a verified domain in Resend
CONTACT_FROM_EMAIL=noreply@yourdomain.com

# Email address to send contact form emails TO
# Where you want to receive inquiries
CONTACT_TO_EMAIL=contact@yourdomain.com
```

**Note:** Without these environment variables, the contact form page will still be accessible, but form submissions will fail. For testing purposes, you can use Resend's test mode which doesn't require domain verification.

##### Testing the Contact Form Locally

When testing the contact form in development:

1. **Test Mode Restrictions**: Resend's test mode only allows sending emails to the email address you used to sign up for Resend
2. **Configuration**: Set `CONTACT_TO_EMAIL` to your Resend account email address:
   ```bash
   CONTACT_FROM_EMAIL=onboarding@resend.dev
   CONTACT_TO_EMAIL=your-resend-signup-email@example.com
   ```
3. **Verification**: After submitting the form, check your inbox for the test email

##### Production Setup

For production use with custom recipient email addresses:

1. **Verify Your Domain**: Add and verify your domain in the Resend dashboard
   - Go to [resend.com/domains](https://resend.com/domains)
   - Add DNS records (SPF, DKIM, DMARC) to your domain
   - Wait for verification to complete

2. **Update Environment Variables**:
   ```bash
   CONTACT_FROM_EMAIL=noreply@yourdomain.com  # Use your verified domain
   CONTACT_TO_EMAIL=your-business-email@example.com  # Can be any email address
   ```

**Note**: The contact form only sends emails to `CONTACT_TO_EMAIL` (where you receive inquiries). Users who submit the form do not receive a copy. The `REPLY-TO` header is set to the user's email address, so you can reply directly from your email client.

## Available Scripts

### Development

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production (automatically copies Stockfish files and seeds database)
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm run copy-stockfish` - Manually copy Stockfish AI engine files

### Database

- `pnpm db:push` - Push schema changes to database
- `pnpm db:seed` - Seed initial data (categories)
- `pnpm db:generate` - Generate migrations from schema changes
- `pnpm db:migrate` - Run pending migrations
- `pnpm db:studio` - Open Drizzle Studio (database GUI)

### Testing

#### Unit Tests (Vitest)

- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run tests once (CI mode)
- `pnpm test:ui` - Run tests with UI

#### E2E Tests (Playwright)

- `pnpm test:e2e` - Run E2E tests in headless mode (CI/CD)
- `pnpm test:e2e:ui` - Run E2E tests with Playwright UI (debugging)
- `pnpm test:e2e:headed` - Run E2E tests with browser visible
- `pnpm test:e2e:debug` - Run E2E tests in debug mode

**Note:** E2E tests automatically start the development server. The first run will download the Chromium browser (~130MB).

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- React 19
- Drizzle ORM
- PostgreSQL (Supabase)
- Playwright (E2E Testing)
- Vitest (Unit Testing)

## Release Process

Use the Claude Code skill to generate release notes:

```
/web-release-notes v0.3.0
```

This skill automates the release workflow:

1. **Gather changes**: Analyzes commits since the previous `web/vX.X.X` tag
2. **Generate content**: Creates release notes in English and Japanese
3. **User review**: Presents content for approval before proceeding
4. **Update CHANGELOG**: Adds entry to `apps/web/CHANGELOG.md`
5. **Create git tag**: Creates annotated tag `web/v0.3.0`
6. **Output SQL**: Writes INSERT statements to `/tmp/release-web-v0.3.0.sql` for the posts table

### Prerequisites

Before running for the first time, ensure at least one previous tag exists:

```bash
git tag -a web/v0.2.0 <commit-hash> -m "Release web v0.2.0"
```

### Manual SQL Execution

After the skill completes, review and execute the generated SQL:

```bash
# Review the SQL file
cat /tmp/release-web-v0.3.0.sql

# Execute against your database
psql $DATABASE_URL -f /tmp/release-web-v0.3.0.sql
```

## License

MIT
