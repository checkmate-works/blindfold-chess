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

### Server Actions (`"use server"` files) Convention

- **Only async function declarations may be exported** — Next.js requires that every export in a `"use server"` file is an async function. Re-exports (`export { fn } from '...'`) are **forbidden** because they are not async function declarations. This causes a build error: _"Only async functions are allowed to be exported in a 'use server' file."_
- **`export type` is safe** — Type-only exports (`export type { T } from '...'`) are allowed because types are erased at build time and are not Server Actions.
- **DRY pattern for shared actions** — When multiple routes share the same Server Action logic, extract the core logic into a base function (e.g., `toggleLikeBase`) and define a thin async wrapper in each route's `_actions/` file. Do NOT re-export the shared function directly.

```typescript
// ✗ Bad — re-export in "use server" file (build error)
'use server';
import { deletePostBase } from '@/app/[locale]/(public)/topics/_actions/deletePost';
// ✓ Also good — import the shared action directly in the consumer (page.tsx)
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';

export { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';

// ✓ Good — async wrapper delegates to shared base function
('use server');

export async function deletePost(postId: string, locale: string) {
  return deletePostBase({ postId, locale, topicType: 'opening' });
}
```

### Barrel File (index.ts) Convention

- **Keep barrel imports for client-safe components** - Components are re-exported from `_components/index.ts` barrel files. Use barrel imports (e.g., `from './_components'`) to keep import statements concise.
- **Exclude server components from barrel files** - Components that use server-only APIs (`next/headers`, `@supabase/ssr`'s `createServerClient`, `next-intl/server` value imports, `@/lib/supabase/server`) or are `async function` components (React Server Components) must NOT be re-exported from barrel files. Import them directly from their file path instead (e.g., `from './_components/Header'` or `from '@/app/[locale]/_components/AdBanner'`). This prevents "server-only module imported in client component" errors when a client component imports from the same barrel.
- **`type`-only imports from server modules are safe** - If a component only uses `import type { ... } from 'next-intl/server'` (type-level only, no value import), it can remain in the barrel file.

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

## Local Development Setup

### Supabase Local

Local development uses [Supabase CLI](https://supabase.com/docs/guides/local-development) instead of standalone PostgreSQL. Supabase local provides PostgreSQL, Auth (GoTrue), Storage, Studio, and Inbucket (email testing) in Docker containers.

```bash
cd apps/web

# Start Supabase local (first run downloads Docker images)
supabase start

# Retrieve keys in JSON format and copy to .env.local:
#   supabase status -o json
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLISHABLE_KEY from JSON output>
#   SUPABASE_SERVICE_ROLE_KEY=<SECRET_KEY from JSON output>

# Run migrations
pnpm db:run-migrate

# Stop Supabase local
supabase stop
```

> These keys are also visible in the human-readable `supabase start` output under "Authentication Keys" (Publishable / Secret).

- **Supabase Studio**: http://127.0.0.1:54323
- **Inbucket (email testing)**: http://127.0.0.1:54324
- **PostgreSQL**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **API**: http://127.0.0.1:54321

### Google OAuth (Optional)

To test Google login locally, set up credentials in `supabase/.env`:

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Copy `supabase/.env.example` to `supabase/.env` and fill in the values

## Database Migration

- **Always use `pnpm db:run-migrate`** — This runs `scripts/migrate.ts`, which executes Drizzle migrations and then applies Supabase-specific SQL (RLS policies, auth hook, profiles setup, storage avatars) in Supabase environments (both local and production).
- **Do NOT use `drizzle-kit push`** — `push` bypasses migration tracking (`drizzle.__drizzle_migrations`) and directly syncs the schema to the DB. This causes the migration journal and actual DB state to diverge, leading to errors on subsequent `migrate` runs.
- **Schema changes workflow**: Edit `src/lib/db/schema.ts` → run `npx drizzle-kit generate --name=<migration_name>` → run `pnpm db:run-migrate`
- **Always specify `--name` when generating migrations** — Running `drizzle-kit generate` without `--name` produces opaque sequential filenames. Always provide a descriptive name so the migration's purpose is clear from the filename alone.
  - Use **snake_case** and keep the name concise (e.g., `create_games_table`, `add_visibility_to_announcements`)
  - The prefix is configured as **timestamp format** (`20240627123900_create_games_table.sql`) in `drizzle.config.ts` to avoid conflicts between branches. Do not change this to sequential index format (`0001_`, `0002_`, ...).
  ```bash
  npx drizzle-kit generate --config drizzle.config.ts --name=create_games_table
  ```
- **Migration file structure**:
  - `drizzle/*.sql` + `drizzle/meta/` — Drizzle-managed migrations (auto-generated, tracked by journal)
  - `drizzle/supabase/` — Supabase-specific SQL (RLS, auth hooks, permissions). Applied by `migrate.ts` in Supabase environments (detected by presence of `supabase_auth_admin` role).

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

## Belt Ranking System (段級位)

A martial arts-inspired progression system (5級 → 初段). Users earn ranks by meeting challenge score thresholds.

### Architecture Overview

| Layer                 | File                                                                      | Responsibility                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema**            | `src/lib/db/schema.ts` (`ranks`, `userRanks`)                             | DB table definitions. `ranks` is admin-managed master data; `user_ranks` is immutable achievement history (INSERT-only, service role only)                                                              |
| **Seed data**         | `src/lib/db/data/ranks.ts`                                                | Code-is-source-of-truth rank definitions with `ALL_RANK_SLUGS`, `RANK_COLORS`, and `ranksSeedData`. Requirements are JSONB arrays (implicit AND). Empty `requirements: []` = conditions not yet defined |
| **Evaluation**        | `src/lib/db/rank-evaluation.ts`                                           | `checkAndGrantRanks(userId)` — called after every challenge completion. Evaluator pattern: one function per requirement `type` (currently `challenge_score`). Returns `GrantedRank[]`                   |
| **Integration**       | `src/lib/db/save-challenge-result.ts`                                     | Calls `checkAndGrantRanks` in try-catch after the challenge transaction commits. Failure does not break the challenge save flow                                                                         |
| **Server Action**     | `src/app/[locale]/(public)/practice/_actions/save-practice-result.ts`     | `SaveResultResponse` includes `grantedRanks?` field, propagated from `saveChallengeResult`                                                                                                              |
| **Achievement Modal** | `src/app/[locale]/(public)/practice/_components/RankAchievementModal.tsx` | Client component. Reads `blindfold_chess_granted_ranks` from sessionStorage on mount, shows celebration modal with CTA to `/ranks`                                                                      |
| **Ranks Page**        | `src/app/[locale]/(public)/ranks/page.tsx`                                | Public SSR page showing all ranks with 4 states: achieved ✓, next (requirements visible), locked 🔒, coming soon                                                                                        |
| **RLS**               | `drizzle/supabase/rls_policies.sql`                                       | Both tables: SELECT only for authenticated/anon. No INSERT/UPDATE/DELETE policies — writes via service role only                                                                                        |

### Key Design Decisions

- **Evaluator pattern (not per-rank strategy)**: Evaluators are keyed by requirement `type` (e.g., `challenge_score`), not by rank. Adding a new rank = seed data only. Adding a new requirement type (e.g., `post_count`) = one new evaluator function.
- **JSONB requirements, not normalized table**: Heterogeneous condition schemas (scores, post counts, likes) make EAV or wide tables impractical. Validation is at the app layer (type guards), not DB level.
- **No `profiles.currentRankId` cache (YAGNI)**: User's current rank is derived from `user_ranks` JOIN. With ≤15 rows per user, this is trivially fast. A cache column can be added if performance becomes an issue.
- **Immutable `user_ranks`**: No `updatedAt`. `achievedAt` serves as creation timestamp. Records are never deleted or updated (grandfathering principle).
- **`onDelete: 'restrict'`** on `user_ranks.rankId` → `ranks.id` — protects achievement history from master data deletion.
- **Linear progression**: `checkAndGrantRanks` stops at the first unmet rank. No skipping.
- **Idempotent grants**: `onConflictDoNothing` on INSERT into `user_ranks`. Safe to call repeatedly.
- **sessionStorage for modal**: Challenge components store `grantedRanks` in sessionStorage before redirecting to result page. `RankAchievementModal` reads and removes it on mount.

### Adding a New Rank Requirement Type

1. Define the type in `src/lib/db/data/ranks.ts` (add to `RankRequirement` union)
2. Add an evaluator function in `src/lib/db/rank-evaluation.ts` (`evaluators` record)
3. Add type guard logic in `parseRequirements` (both `rank-evaluation.ts` and `ranks/page.tsx`)
4. Add i18n display logic in `ranks/page.tsx` if needed
5. Update seed data with the new requirement

### Adding a New Rank

1. Add entry to `ranksSeedData` in `src/lib/db/data/ranks.ts` (with requirements or `[]` for placeholder)
2. Add slug to `ALL_RANK_SLUGS` and color to `RANK_COLORS` in same file
3. Add i18n entries in `src/messages/{en,ja}.json` under `ranks.rankNames` and `rankAchievement.rankNames`
4. Run `pnpm db:seed`

### Adding Leaderboard Support to a Practice Module

When a practice module has challenge mode and should record scores on the leaderboard, follow these steps:

1. **Register as challenge module** — Add module name to `CHALLENGE_MENU_TYPES` in `src/lib/db/practice-menu-types.ts`
2. **Add leaderboard key derivation** — Add a case in `deriveLeaderboardKey()` in `src/lib/db/leaderboard-key.ts`. Return `'default'` for modules with no settings-based segmentation, or derive from settings (e.g., `boardOrientation` for coordinate_quiz)
3. **Register in leaderboard types** — In `src/app/[locale]/(public)/leaderboard/_lib/types.ts`:
   - Add to `LeaderboardModule` type
   - Add to `LeaderboardModuleSlug` type (kebab-case)
   - Add to `MODULES` array
   - Add to `MODULE_KEYS` (e.g., `diagonal_quiz: ['default']`)
   - Add to `VALID_MODULE_FILTERS`
   - Add to `MODULE_TO_SLUG` and `SLUG_TO_MODULE` mappings
   - Add to `buildChallengePath()` switch
4. **Add module emoji** — Add entry in `src/app/[locale]/(public)/leaderboard/_lib/icons.tsx` (`MODULE_EMOJIS`)
5. **Create save-result action** — Create `src/app/[locale]/(public)/practice/{module}/_actions/save-result.ts` as a thin wrapper calling `savePracticeResult(menuType, settings, challengeFields)`
6. **Call save on challenge finish** — In the challenge session component, call the save action before redirecting to results. Use `savedRef` to prevent double saves. Handle `grantedRanks` (sessionStorage) and errors (toast flag)
7. **Switch result page to leaderboard version** — Change from `createSimplePracticeResultPage(ResultClient)` to `createLeaderboardPracticeResultPage(ResultClient, { module, resolveKey })`. Update `ResultClient` to accept and render `leaderboardRows` and `leaderboardDetailPath` via `LeaderboardPreview`
8. **Update tests** — Update hardcoded entry counts in `leaderboard/_lib/__tests__/types.test.ts`, `leaderboard/_actions/__tests__/getUserRanks.test.ts`, and `src/lib/db/leaderboard-key.test.ts`

## Important Notes

- Prioritize performance and SEO in all decisions
- **Database schema** is defined in `src/lib/db/schema.ts` (Drizzle ORM). See TSDoc `@design` tags on each table for design rationale.
