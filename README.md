# Blindfold Chess (Monorepo)

Free online platform to practice blindfold chess.

This repository is a Monorepo managed by [Turborepo](https://turbo.build/).

## Directory Structure

- `apps/web`: The Next.js web application (moved from root)
- `apps/mobile`: (Planned) React Native mobile application
- `packages/`: Shared packages

## Quick Start

### Prerequisites

- Node.js 24.x
- pnpm 10.x

> [!TIP]
> This project uses [Volta](https://volta.sh/) to pin the Node.js version.
> If you have Volta installed, it will automatically switch to the correct Node.js version defined in `package.json`.
>
> To pin versions (updates package.json):
>
> ```bash
> volta pin node@24
> ```
>
> For pnpm, use `volta install` to ensure the correct version is active, as `volta pin` may not support pnpm in all environments:
>
> ```bash
> volta install pnpm@10
> ```

### Installation

```bash
# Install dependencies for all apps/packages
pnpm install
```

### Development

To start the development server for all apps (currently only `web`):

```bash
pnpm dev
```

This runs `turbo run dev`, which starts the `web` app at [http://localhost:3000](http://localhost:3000).

### Scripts

From the root directory:

- `pnpm dev`: Start all apps in development mode
- `pnpm build`: Build all apps for production
- `pnpm lint`:/ Lint all apps
- `pnpm test`: Run tests across the workspace

### Web App Specific Commands

Some commands are specific to the web application and should be run inside `apps/web` or filtered via turbo:

```bash
# Copy Stockfish files (required for AI)
cd apps/web && pnpm run copy-stockfish
# OR
pnpm --filter web run copy-stockfish
```

For more details on the web application, see [apps/web/README.md](apps/web/README.md).

## Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/).

### Root Package

The root `package.json` has version `0.0.0` and is **not versioned**. It serves only as a workspace definition for the monorepo and is not published or released.

### Application Packages

Each application (`apps/web`, `apps/mobile`, etc.) maintains its own independent version following Semantic Versioning.

Changelogs:

- [apps/web/CHANGELOG.md](apps/web/CHANGELOG.md)
