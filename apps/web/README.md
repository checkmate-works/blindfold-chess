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

Deployment guide for Vercel and Supabase, including monorepo Root Directory configuration and region selection.

See [docs/deployment.md](docs/deployment.md) for details.

## Environment Variables

Configuration for site URL, database connection, Google Analytics, cookie consent banner, Sentry error tracking, and contact form (Resend).

See [docs/environment-variables.md](docs/environment-variables.md) for details.

## Available Scripts

Standard scripts (`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm test`) work as expected. Below are project-specific scripts worth noting:

- `pnpm run copy-stockfish` - Copy Stockfish AI engine files to public directory (required before first run)
- `pnpm db:push` - Push schema changes to database
- `pnpm db:seed` - Seed initial data (categories)
- `pnpm db:generate` - Generate migrations from schema changes
- `pnpm db:migrate` - Run pending migrations
- `pnpm db:studio` - Open Drizzle Studio (database GUI)
- `pnpm test:run` - Run unit tests once (CI mode)
- `pnpm test:e2e` - Run E2E tests in headless mode (auto-starts dev server)

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

Automates release note generation, git tagging, and SQL output using the Claude Code `/web-release-notes` skill.

See [docs/release-process.md](docs/release-process.md) for details.

## License

MIT
