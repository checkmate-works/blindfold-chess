# Project Implementation Guidelines

This document outlines the technical decisions and implementation guidelines for the Blindfold Chess project.

## Core Architecture

### Framework & Routing

- **Next.js App Router** - Use App Router exclusively (no Pages Router)
- **Server Components by Default** - Prefer Server Components for SEO benefits
- **Route Groups** - Use route groups like `(landing)` for organization without affecting URLs

### URL Naming Convention

Route segment names use **singular or plural form depending on the nature of the route**, not uniformly one or the other. This follows the established convention seen in major web applications (Lichess, Chess.com, Cal.com, etc.) and differs from REST API conventions where all endpoints are plural.

| Route type                                               | Form         | Examples                                 | Rationale                                              |
| -------------------------------------------------------- | ------------ | ---------------------------------------- | ------------------------------------------------------ |
| **Resource collection** (list → detail CRUD)             | **Plural**   | `/posts`, `/games`, `/topics`            | Represents a browsable collection of items             |
| **Activity / functional area** (user performs an action) | **Singular** | `/practice`, `/learn`                    | Represents "a place to do something", not a collection |
| **Personal section**                                     | **Singular** | `/mypage`, `/profile`                    | One per user, not a collection                         |
| **Static / informational page**                          | **Singular** | `/faq`, `/privacy`, `/terms`, `/contact` | Single page, not a collection                          |

**How to decide for new routes:**

- Ask: "Is the user browsing a list of items?" → **plural** (e.g., `/posts`, `/games`)
- Ask: "Is the user performing an activity or viewing a singular concept?" → **singular** (e.g., `/learn`, `/practice`)

### Static Generation

- **`generateStaticParams` must return all dynamic segments** — For routes under `[locale]/`, always include `locale` in the returned params using `SUPPORTED_LOCALES` from `@/config`. Omitting `locale` causes "Page changed from static to dynamic at runtime" errors in production (the error does not surface in `next dev`).

### SEO Optimization

- **Server-Side Rendering** - Maximize SSR for better search engine crawling
- **Link Components** - Always use Next.js Link with required `href` attributes for crawler accessibility
  - Reference: https://nextjs.org/learn/seo/on-page-seo#nextlink
- **Semantic HTML** - Use proper HTML elements for better SEO

## Technology Stack

### Styling

- **Tailwind CSS v4** - Utility-first CSS framework
- **CSS Variables** - Theme color values are defined in `@blindfold-chess/ui` (`packages/ui/src/theme/`) and injected as CSS custom properties via `generateThemeCSS()` in layout.tsx. `globals.css` bridges these variables into Tailwind's `@theme` system.
- **No Hardcoded Colors** - Use CSS variable-based utilities instead of direct color classes (e.g., `text-foreground` instead of `text-gray-800`)
- **Dark Mode Support** - Implement with `next-themes` and CSS variables
- **Minimal External CSS** - Avoid external CSS files, use Tailwind utilities inline
- **Icons** - Use `@blindfold-chess/icons` for custom/chess-related icons (cross-platform, see `packages/icons/CLAUDE.md`). Use `react-icons` for general-purpose icons (Font Awesome, Material Icons, etc.)

### CSS Implementation Details

- **@theme Directive** - Use Tailwind v4's `@theme` in `globals.css` to bridge CSS custom properties into Tailwind utility classes
- **@custom-variant** - Define dark mode variant with `@custom-variant dark`
- **globals.css** - Tailwind CSS integration layer only (Tailwind init, dark variant, `@theme` bridge). Does NOT define color values — those live in `@blindfold-chess/ui`. Third-party CSS (e.g., KaTeX) is imported at the component level, not here.

## Internationalization

- **next-intl** - For i18n support
- **URL Path-based Locales** - Use `/[locale]/` pattern
- **Supported Languages** - English (`en`) and Japanese (`ja`)

## Testing

### Framework

- **Vitest** - Unit and integration testing framework

### Test File Organization

- **Unit Tests** - Co-located with source files using `.test.ts` or `.test.tsx` extension (e.g., `src/app/[locale]/play/_lib/move-sorter.test.ts`)
- **E2E Tests** - Separate directory at `tests/e2e/` using `.spec.ts` extension

## Code Quality

### Best Practices

- **Component Colocation** - Keep related files close to their components
- **Image Optimization** - Always use Next.js Image component
- **Font Optimization** - Use `next/font` for web fonts (Inter)

### Import Path Convention

- **Same Directory** - Use relative imports: `import { Foo } from './Foo'`
- **Parent Directory** - Use relative imports: `import { Bar } from '../Bar'`
- **Two or More Levels Up** - Use absolute imports with `@` alias: `import { Baz } from '@/app/[locale]/_components/Baz'`
- **lib Directory** - Always use `@/lib/...` for shared utilities and types

### Barrel File (index.ts) Convention

- **Keep barrel imports** - Components are re-exported from `_components/index.ts` barrel files. Use barrel imports (e.g., `from './_components'`) to keep import statements concise.
- **Do NOT split or eliminate barrels for speculative performance reasons** - While barrel files re-exporting `'use client'` components can theoretically hinder tree-shaking, Next.js with Turbopack handles this well in practice. Do not convert barrel imports to individual file imports without concrete evidence (e.g., bundle analysis) showing an actual problem. The readability and maintainability cost of ~45+ file changes outweighs unproven benefits.

### Import Order Convention

Imports are automatically sorted by Prettier using `@trivago/prettier-plugin-sort-imports` in the following order:

1. React imports
2. Next.js imports
3. Third-party modules
4. `@/lib/` imports
5. `@/app/[locale]/` imports
6. Relative imports (`.` and `..`)

Groups are separated by blank lines, and specifiers within imports are sorted alphabetically.

**Examples:**

```typescript
// ✓ Good - proper import path usage
import { Button } from './Button';
import { Header } from '../Header';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

// ✗ Bad - don't use deep relative paths
import { PageTitle } from '../../_components/PageTitle';

// ✓ Good - proper import order (automatically enforced by Prettier)
import { useRouter } from 'next/navigation';

import { format } from 'date-fns';

import type { Game } from '@/lib/types';

import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { Button } from './Button';
```

## Feature Documentation

Feature-specific documentation is written as TSDoc comments in each feature's `page.tsx` file.
This keeps documentation close to the code and avoids bloating this global file.

### Convention

- **Feature Name** - First line format: `Feature Name (日本語名)`. The Japanese subtitle enables Japanese prompt engineering while keeping the primary name in English for OSS compatibility.
- **@description** - What the feature does (purpose and goals)
- **@flow** - How the feature works (user journey / phase transitions)

Avoid documenting information that is self-evident from the code (routes, components, query params with meaningful names).

## Database Migration

- **Always use `pnpm db:run-migrate`** — This runs `scripts/migrate.ts`, which executes Drizzle migrations and then applies Supabase-specific SQL (RLS policies, auth hook, profiles setup, storage avatars) in production environments.
- **Do NOT use `drizzle-kit push`** — `push` bypasses migration tracking (`drizzle.__drizzle_migrations`) and directly syncs the schema to the DB. This causes the migration journal and actual DB state to diverge, leading to errors on subsequent `migrate` runs.
- **Schema changes workflow**: Edit `src/lib/db/schema.ts` → run `pnpm db:generate` → run `pnpm db:run-migrate`
- **Always specify `--name` when generating migrations** — Running `drizzle-kit generate` without `--name` produces opaque sequential filenames. Always provide a descriptive name so the migration's purpose is clear from the filename alone.
  - Use **snake_case** and keep the name concise (e.g., `create_games_table`, `add_visibility_to_announcements`)
  - The prefix is configured as **timestamp format** (`20240627123900_create_games_table.sql`) in `drizzle.config.ts` to avoid conflicts between branches. Do not change this to sequential index format (`0001_`, `0002_`, ...).
  ```bash
  npx drizzle-kit generate --config drizzle.config.ts --name=create_games_table
  ```
- **Migration file structure**:
  - `drizzle/*.sql` + `drizzle/meta/` — Drizzle-managed migrations (auto-generated, tracked by journal)
  - `drizzle/supabase/` — Supabase-specific SQL (RLS, auth hooks, permissions). Applied by `migrate.ts` only in Supabase environments.

## Moderation & Audit Architecture

### Design Pattern: Event Log with Materialized State

The moderation system uses a **dual-source pattern** adopted from Discourse, GitLab, Mastodon, and Lichess — NOT pure Event Sourcing.

- **State flag** on `profiles` table (`bannedAt`) — enables O(1) status checks. Every Server Action calls `isUserBanned()` (`@/lib/ban`), so deriving state by replaying events would be prohibitively expensive.
- **Event log** in `moderation_actions` table — immutable, append-only audit trail recording all admin operations with full context (who acted, on what, why, when). Corrections are recorded as new events (e.g., `unban` after `ban`), never as updates to existing records.

### Key Design Decisions

- **Polymorphic target** (`target_type` + `target_id`) — same pattern as `topicPosts.topicType + topicKey`. No schema changes when new moderation targets are added.
- **`action` is varchar, not pgEnum** — avoids ALTER TYPE migrations for new action types.
- **`metadata` (JSONB)** — stores action-specific context (deleted content, previous values). Replaces dedicated `previous_value`/`new_value` columns.
- **No `updated_at`** — audit logs are immutable by design.
- **`reason`** (text) — human-readable justification. For BAN, replaces the former `profiles.ban_reason` column.
- **`ip_address`** — for forensic analysis of admin actions.
- **FK** (`actor_id` → `auth.users`) — defined in Supabase-side SQL, following established pattern.

### Usage Patterns

| Operation               | State source                                         | Event log                                                               |
| ----------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Is user banned?         | `profiles.bannedAt IS NOT NULL` via `isUserBanned()` | —                                                                       |
| Why was user banned?    | —                                                    | Latest `moderation_actions` where `action='ban'` AND `target_id=userId` |
| Full moderation history | —                                                    | All `moderation_actions` for a `target_id`, ordered by `created_at`     |

See `moderation_actions` table TSDoc in `src/lib/db/schema.ts` for detailed design rationale.

## Important Notes

- Prioritize performance and SEO in all decisions
