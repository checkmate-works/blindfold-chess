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
