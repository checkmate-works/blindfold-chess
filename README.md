# Blindfold Chess

Free online platform to practice blindfold chess.

## Quick Start

### Prerequisites

- Node.js 22.x
- pnpm 10.x

### Installation

```bash
# Clone the repository
git clone git@github.com:checkmate-works/blindfold-chess.git
cd blindfold-chess

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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

## Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- React 19

## License

MIT
