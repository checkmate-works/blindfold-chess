# Blindfold Chess (Monorepo)

Free online platform to practice blindfold chess.

This repository is a Monorepo managed by [Turborepo](https://turbo.build/).

## Directory Structure

- `apps/web`: Next.js web application
- `apps/mobile`: React Native (Expo) mobile application

### Shared Packages

| Package                  | Description                                                            |
| ------------------------ | ---------------------------------------------------------------------- |
| `packages/types`         | Shared TypeScript type definitions                                     |
| `packages/features`      | Cross-platform business logic (coordinate-quiz, etc.)                  |
| `packages/ui`            | Shared color/theme constants (single source of truth for web & mobile) |
| `packages/eslint-config` | Shared ESLint configuration                                            |

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

To start the development server for all apps:

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

## Automation (Owner-only)

This repository uses [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action) to let the repository owner drive Claude Code from GitHub issue comments. Mentioning `@claude` in an issue comment triggers `.github/workflows/claude-issue-solve.yml`, which runs Claude Code against the owner's Claude Max subscription and opens a Pull Request.

**This automation is owner-only** (`github.actor == 'k0kishima'`). It does not run on fork PRs and does not run on comments from anyone other than the owner. External contributors should not rely on or attempt to invoke it.

## Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/).

### Root Package

The root `package.json` has version `0.0.0` and is **not versioned**. It serves only as a workspace definition for the monorepo and is not published or released.

### Application Packages

Each application (`apps/web`, `apps/mobile`, etc.) maintains its own independent version following Semantic Versioning.

### Git Tag Format

Git tags use a prefix to identify the application:

- **Web app**: `web/v0.1.0`, `web/v0.2.0`, ...
- **Mobile app**: `mobile/v0.1.0`, `mobile/v0.2.0`, ... (planned)

Example:

```bash
git tag -a web/v0.3.0 -m "Release web v0.3.0"
```

Changelogs:

- [apps/web/CHANGELOG.md](apps/web/CHANGELOG.md)
