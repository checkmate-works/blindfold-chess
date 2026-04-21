# Project Implementation Guidelines

This document outlines the technical decisions and implementation guidelines for the Blindfold Chess project.

## Core Architecture

### Framework & Routing

- **Next.js App Router** - Use App Router exclusively (no Pages Router)
- **Server Components by Default** - Prefer Server Components for SEO benefits
- **Route Groups** - Use route groups like `(landing)` for organization without affecting URLs
- **`(no-ads)` Route Group** - 広告を表示しないページを追加するには、そのページを `(no-ads)` route group 配下に配置します（例: `foo/(no-ads)/page.tsx`）。同階層の `(no-ads)/layout.tsx` が `markNoAdsScope()` を呼び、`resolveAdGuard()` が最優先で `'hidden'` を返すことで、descendant の AdSense スロットが DOM に一切出なくなります。ページ側のコード変更は不要です。

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
- **Title Suffix Rule** - Page titles use a dynamic suffix to avoid keyword stuffing:
  - If the title contains the SEO site name phrase for the current locale → suffix is the brand name for that locale
  - Otherwise → suffix is the SEO site name for that locale
  - The per-locale keyword/brand pairs are defined in `SITE_NAMES` in `apps/web/src/app/[locale]/_lib/metadata.ts`. As of this writing:
    - `en`: "Blindfold Chess" / "Shingan Chess"
    - `ja`: "目隠しチェス" / "心眼チェス"
    - `es`: "Ajedrez a Ciegas" / "Shingan Chess"
    - `pt-BR`: "Xadrez às Cegas" / "Shingan Chess"
  - `SITE_NAMES` is typed `Record<Locale, { seoSiteName; siteName }>`, so adding a locale to `SUPPORTED_LOCALES` without extending `SITE_NAMES` is a compile-time error (there is intentionally no silent runtime fallback).
  - Use `resolveTitle(title, locale)` from `_lib/metadata.ts` for the `title` field in `generateMetadata`
  - Use `buildPageTitle(title, locale)` for OGP titles and other contexts needing the full title string

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
- **Source of truth** - `SUPPORTED_LOCALES` exported from `@/config` is the single source of truth for every locale-derived artifact (metadata, OG tags, `hreflang`, sitemap, JSON-LD, routing, `<html lang>`, message file resolution). All i18n-aware code derives from this constant — there is no second list to keep in sync.
- **Currently supported (for quick reference)** - `en`, `es`, `pt-BR`, `ja`. This prose may lag the code; when in doubt, `SUPPORTED_LOCALES` wins.

### Locale granularity (region-qualified tags)

The project prefers region-qualified BCP 47 tags (e.g., `pt-BR`) over bare language tags (e.g., `pt`) when the content targets a specific region. Brazilian Portuguese and European Portuguese diverge meaningfully in vocabulary (`usuário` vs `utilizador`, `celular` vs `telemóvel`, `tela` vs `ecrã`), pronouns (`você` vs `tu`), and register — and `pt-BR.json` is written specifically for Brazilian audiences. BCP 47, `hreflang`, and Google all distinguish `pt-BR` from `pt-PT`; emitting bare `pt` forces search engines and browsers to guess which variant the user will receive, weakening regional targeting.

Starting with a region-qualified tag also keeps future expansion additive: adding `pt-PT` (or `en-GB`, etc.) later is a single-line change to `SUPPORTED_LOCALES` with no migration. The convention applies generally — **prefer region-qualified BCP 47 tags whenever the content targets a specific region**; use bare language tags only when the content is truly region-neutral.

As of this writing, the project ships `pt-BR` only (not `pt-BR` + `pt-PT`): ~95% of Portuguese-speaking web users are in Brazil, and with only one translation available, also emitting a duplicated or machine-translated `pt-PT` would trigger Google "duplicate content" / "alternate page with wrong hreflang" warnings — worse for SEO than shipping `pt-BR` alone. Portugal users are served the `pt-BR` page, which Google treats as an acceptable near-match. See the `SUPPORTED_LOCALES` TSDoc in `apps/web/src/config.ts` for the full rationale.

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
- **`export type { ... }` brace re-exports are FORBIDDEN** — The following forms are **not safe** in `"use server"` files under Next.js 16 + Turbopack:
  ```ts
  export type { T }; // re-export of a locally imported type
  export type { T } from '...'; // direct re-export from another module
  ```
  The Server Action transform does NOT reliably erase these statements: they survive into the bundled server chunk as value references and produce a runtime `ReferenceError: <Type> is not defined` on first POST (Server Action invocation). This contradicts what TypeScript alone would do, and it is **not caught by GET smoke tests** — only by actually invoking a Server Action.
  - **Reproduced on 2026-04-10** as `ReferenceError: ToggleLikeResult is not defined` thrown from the home feed's Like action. The three affected files (`position-memory`, `topics/openings/.../toggleLike`, `topics/squares/.../toggleLike`) all had an `export type { ToggleLikeResult }` line; removing those lines eliminated the error.
  - **Rule**: Never write `export type { ... }` re-exports inside a `"use server"` file. If a type needs to be shared, define it in a separate non-`"use server"` module (e.g., `_lib/types.ts` or `@/lib/<feature>/types.ts`) and have consumers `import type { ... }` from there. The `"use server"` action file may then `import type` (not re-export) that type internally for its own function signatures.
  - **`export type Foo = ...` (local alias declarations) are still allowed** — empirically these do not reproduce the runtime error. A static regression test (`src/lib/use-server-type-imports.test.ts`) enforces only the brace re-export ban. If a future repro shows local aliases also break, tighten the test.
  - **Inline `type` specifiers in value imports are also unsafe** — `import { type X, y } from '...'` inside `"use server"` files must be split into `import type { X } from '...'` + `import { y } from '...'` for the same reason.
- **DRY pattern for shared actions** — When multiple routes share the same Server Action logic, extract the core logic into a base function (e.g., `toggleLikeBase`) and define a thin async wrapper in each route's `_actions/` file. Do NOT re-export the shared function directly, and do NOT re-export its return type as `export type` either — put the type in a plain module.

```typescript
// ✗ Bad — re-export in "use server" file (build error)
'use server';
import type { ToggleLikeResult } from '@/lib/positions/like-actions';
import { togglePositionLike } from '@/lib/positions/like-actions';

import { deletePostBase } from '@/app/[locale]/(public)/topics/_actions/deletePost';

export { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';

// ✗ Bad — export type in "use server" file (runtime ReferenceError under Next.js 16 + Turbopack)
('use server');
export type { ToggleLikeResult } from '@/lib/positions/like-actions';
export async function toggleLike(id: string) {
  /* ... */
}

// ✓ Good — put the type in a plain module and only `import type` it inside the action
// @/lib/positions/like-actions.ts (no "use server" directive):
//   export type ToggleLikeResult = { liked: boolean; likeCount: number } | { error: string };
('use server');

export async function toggleLike(id: string, locale: string): Promise<ToggleLikeResult> {
  return togglePositionLike(id, locale);
}

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

| Layer                 | File                                                                              | Responsibility                                                                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema**            | `src/lib/db/schema.ts` (`ranks`, `userRanks`)                                     | DB table definitions. `ranks` is admin-managed master data; `user_ranks` is immutable achievement history (INSERT-only, service role only)                                                              |
| **Seed data**         | `src/lib/db/data/ranks.ts`                                                        | Code-is-source-of-truth rank definitions with `ALL_RANK_SLUGS`, `RANK_COLORS`, and `ranksSeedData`. Requirements are JSONB arrays (implicit AND). Empty `requirements: []` = conditions not yet defined |
| **Evaluation**        | `src/lib/db/rank-evaluation.ts`                                                   | `checkAndGrantRanks(userId)` — called after every challenge completion. Evaluator pattern: one function per requirement `type` (currently `challenge_score`). Returns `GrantedRank[]`                   |
| **Integration**       | `src/lib/db/save-challenge-result.ts`                                             | Calls `checkAndGrantRanks` in try-catch after the challenge transaction commits. Failure does not break the challenge save flow                                                                         |
| **Server Action**     | `src/app/[locale]/(public)/practice/(challenge)/_actions/save-practice-result.ts` | `SaveResultResponse` includes `grantedRanks?` field, propagated from `saveChallengeResult`                                                                                                              |
| **Achievement Modal** | `src/app/[locale]/(public)/practice/_components/RankAchievementModal.tsx`         | Client component. Reads `blindfold_chess_granted_ranks` from sessionStorage on mount, shows celebration modal with CTA to `/ranks`                                                                      |
| **Ranks Page**        | `src/app/[locale]/(public)/ranks/page.tsx`                                        | Public SSR page showing all ranks with 4 states: achieved ✓, next (requirements visible), locked 🔒, coming soon                                                                                        |
| **RLS**               | `drizzle/supabase/rls_policies.sql`                                               | Both tables: SELECT only for authenticated/anon. No INSERT/UPDATE/DELETE policies — writes via service role only                                                                                        |

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
3. Add i18n entries in all locale message files (`src/messages/*.json`) under `ranks.rankNames` and `rankAchievement.rankNames`
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

## Article Management (記事管理)

Admin CRUD feature for managing articles published on the public `/articles` pages.

### Architecture Overview

| Layer                 | Path                                                               | Description                                                       |
| --------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **DB schema**         | `src/lib/db/schema.ts` (`articles`, `articleImages`)               | Drizzle table definitions. `articles` stores body in dual format. |
| **Types**             | `src/app/admin/articles/_lib/types.ts`                             | `ContentFormat`, Tiptap JSON types, form/mutation data shapes.    |
| **Validation**        | `src/app/admin/articles/_lib/validation.ts`                        | `validateArticleData()` — shared by create & update actions.      |
| **Server Actions**    | `src/app/admin/articles/_actions/{create,update,delete}Article.ts` | Mutation entry points (admin-guarded).                            |
| **Editor form**       | `src/app/admin/articles/_components/ArticleForm.tsx`               | Full-height Tiptap editor layout with metadata side panel.        |
| **Tiptap extensions** | `src/app/admin/articles/_components/tiptap-extensions.ts`          | StarterKit + Link, Image, YouTube, XEmbed.                        |
| **Image upload**      | `src/app/admin/articles/_hooks/useImageUpload.ts`                  | Client-side upload hook (placeholder → replace pattern).          |
| **Image API**         | `src/app/api/admin/articles/[id]/images/route.ts`                  | POST/DELETE for Supabase Storage + `article_images` tracking.     |
| **Admin list page**   | `src/app/admin/articles/page.tsx`                                  | Table listing all articles with edit/delete actions.              |
| **Publish form**      | `src/app/admin/articles/_components/ArticlePublishForm.tsx`        | Set `publishedAt`, `pinnedAt`, and publish.                       |
| **Public list**       | `src/app/[locale]/(public)/articles/page.tsx`                      | Paginated, slug-deduplicated listing with locale fallback.        |
| **Public detail**     | `src/app/[locale]/(public)/articles/[slug]/page.tsx`               | Renders article body based on `contentFormat`.                    |
| **Tiptap renderer**   | `src/app/[locale]/_components/TiptapRenderer.tsx`                  | Server component — maps Tiptap JSON to React (no editor bundle).  |
| **Markdown renderer** | `src/app/_components/MarkdownRenderer.tsx`                         | Client component — `react-markdown` with GFM, KaTeX, custom imgs. |

### Content Format (content_format)

The `articles` table has a `content_format` column (`varchar(20)`, default `'markdown'`) that determines how the article body is stored and rendered:

| Format        | `content` column                     | `content_json` column | Admin editor support | Public renderer    |
| ------------- | ------------------------------------ | --------------------- | -------------------- | ------------------ |
| `markdown`    | Markdown source (primary body)       | `NULL`                | **Not supported**    | `MarkdownRenderer` |
| `tiptap_json` | Plain-text fallback (for search/SEO) | Tiptap JSON document  | Supported            | `TiptapRenderer`   |

**Key behaviors:**

- The admin editor (`ArticleForm`) always sets `contentFormat: 'tiptap_json'` in `buildFormData()`. There is no UI toggle for format selection.
- When a `markdown` article is loaded for editing, `contentJson` is `null`, so the Tiptap editor starts empty — the original Markdown content is **not** converted to Tiptap JSON.
- The public article detail page (`articles/[slug]/page.tsx`) branches on `contentFormat`: `tiptap_json` articles use `TiptapRenderer`; all others fall back to `MarkdownRenderer`.

### Rich Editor (Tiptap) Implementation

The admin editor uses **Tiptap v2** (`@tiptap/react`) with these extensions (configured in `tiptap-extensions.ts`):

| Extension      | Node/Mark name | Features                                                                 |
| -------------- | -------------- | ------------------------------------------------------------------------ |
| StarterKit     | (multiple)     | Paragraph, heading (h2/h3), bold, italic, strike, code, lists, etc.      |
| Link           | `link`         | Inline hyperlinks. Click disabled in editor; opens in new tab on render. |
| Placeholder    | —              | Ghost placeholder text when editor is empty.                             |
| ResizableImage | `image`        | Extended Image with `size` (large/small) + `align` (left/center/right).  |
| Youtube        | `youtube`      | YouTube embed with privacy-enhanced URLs (`youtube-nocookie.com`).       |
| XEmbed         | `twitterEmbed` | X (formerly Twitter) embed. Name kept as `twitterEmbed` for compat.      |

**Editor UI components:**

- `BubbleToolbar` — floating toolbar on text selection (bold, italic, strike, link, code).
- `PlusMenu` — floating "+" button on empty paragraphs for inserting blocks (headings, lists, blockquote, hr, image, YouTube, X embed).
- `ImageNodeView` — custom NodeView for images with size/align toggle toolbar.
- `YoutubeNodeView` / `XEmbedNodeView` — custom NodeViews for embed previews.

**Image upload flow** (via `useImageUpload` hook):

1. Image selected via PlusMenu, drag-and-drop, or paste.
2. A 1x1 transparent GIF placeholder is inserted at cursor position.
3. File is POSTed to `/api/admin/articles/[id]/images` (multipart/form-data).
4. API validates (MIME type, binary signature, 5 MB limit), uploads to Supabase Storage (`article-images/{articleId}/{timestamp}.{ext}`), and records in `article_images` table.
5. On success, placeholder is replaced with the public URL. On failure, placeholder is removed.
6. Image upload is disabled until the article has been saved (requires `articleId`).

### Considerations for Markdown Editing Support

If adding the ability to edit `markdown` format articles in the admin UI:

1. **Format-aware editor routing** — The edit page (`[id]/edit/page.tsx`) needs to check `article.contentFormat` and render either the Tiptap editor or a Markdown editor (e.g., textarea with preview, or a Markdown-specific WYSIWYG).
2. **Preserve content_format** — When saving a markdown article, the action must keep `contentFormat: 'markdown'` (not override to `'tiptap_json'`). The current `ArticleForm.buildFormData()` hardcodes `'tiptap_json'`.
3. **Migration path** — Consider whether to support one-way migration from Markdown to Tiptap JSON (convert on edit). This avoids maintaining two editor stacks long-term but requires a Markdown-to-Tiptap converter.
4. **content vs. contentJson** — For `markdown` articles, `content` is the source of truth and `contentJson` should remain `null`. The validation logic already allows empty `content` only for `tiptap_json`.
5. **Image handling** — Markdown articles use inline image URLs (e.g., `![alt](/path)`). The current `useImageUpload` hook is Tiptap-specific. A Markdown editor would need its own image insertion mechanism (e.g., insert `![](url)` at cursor).
6. **Preview rendering** — The existing `MarkdownRenderer` component can be reused for live preview.

## User Grants System (権限付与)

A generic system for granting time-limited benefits to users. Supports ad-free access, paywall content access, and future benefit types.

### Architecture Overview

| Layer              | File                                  | Responsibility                                                                                                                  |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Schema**         | `src/lib/db/schema.ts` (`userGrants`) | DB table. See TSDoc `@design` tags for full design rationale                                                                    |
| **Core logic**     | `src/lib/user-grants.ts`              | `hasActiveGrant(userId, benefitType)` — cached lookup; `calcGrantStartsAt(userId, benefitType)` — additive stacking calculation |
| **Ad integration** | `src/lib/ad.ts`                       | `shouldShowAdsForUser()` checks both Stripe subscriptions AND `hasActiveGrant(userId, 'ad_free')`                               |
| **Admin page**     | `src/app/admin/grants/page.tsx`       | Grant creation form, paginated list, revoke. See TSDoc for full description                                                     |
| **Server actions** | `src/app/admin/grants/_actions/`      | `createGrant` (with UUID + duration validation), `revokeGrant` (logical delete via `revokedAt`)                                 |

### Key Design Decisions

- **Single `user_grants` table** for all benefit types — `benefitType` discriminator ('ad_free', 'paywall_access', ...) avoids per-benefit tables. `grantType` tracks the source ('admin_manual', 'topic_post', 'campaign', ...). Both are varchar for extensibility.
- **`resourceType` + `resourceId`** — NULL for global benefits (ad_free), populated for scoped benefits (e.g., paywall access to a specific article).
- **Additive stacking** — New grants start from `max(expiresAt)` of existing non-revoked grants, so multiple grants extend the benefit period.
- **No `grantedBy` column** — Admin audit trail is handled by the existing `moderation_actions` table.
- **`revokedAt` logical deletion** — Grants are never physically deleted.
- **Ad-free sources** — A user sees no ads if they have EITHER an active Stripe subscription (`subscriptions` table) OR an active ad_free grant (`user_grants` table). Both are checked in `shouldShowAdsForUser()`.

### Adding a New Benefit Type

1. Use the existing `user_grants` table with a new `benefitType` value (no schema change needed).
2. Create a check function similar to `hasActiveGrant(userId, 'new_type')` or use the existing one.
3. Integrate the check at the appropriate gate (e.g., content access middleware, component guard).
4. For scoped benefits, also filter by `resourceType`/`resourceId`.

### Adding a New Grant Trigger

1. Call `calcGrantStartsAt(userId, benefitType)` to get the stacking start time.
2. Insert into `user_grants` with the appropriate `grantType` (e.g., 'topic_post').
3. For automated (high-frequency) triggers, wrap the read + insert in a `db.transaction()` to prevent race conditions. The current admin_manual flow intentionally omits the transaction as it is low-frequency.
4. Call `revalidateTag('grant-status')` after insert.

## Glossary (Japanese ↔ English)

The app was originally designed in Japanese, and the team still thinks about
several features using their Japanese names. This table maps those Japanese
domain terms to their English counterparts and points at the code that owns
each concept, so that AI agents (and human readers) can locate the relevant
files when a user refers to a concept in Japanese.

| Japanese                      | English                                  | Where                                                                                                                             |
| ----------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 実績 / 実績バッジ             | achievement / achievement badge          | `src/lib/achievements/`, `src/lib/db/data/achievements.ts`, `src/app/admin/achievements/`, `src/messages/*.json` (`achievements`) |
| 感想戦                        | postmortem                               | `src/app/[locale]/(public)/games/play/postmortem/`                                                                                |
| 目隠しチェス / 心眼チェス     | blindfold chess / Shingan Chess (brand)  | See "Title Suffix Rule" in this file; strings in `src/messages/*.json`                                                            |
| 段級位                        | kyu/dan ranking (belt system)            | `src/lib/db/schema/tables.ts` (`ranks`, `userRanks`), `src/lib/db/data/ranks.ts`, `src/app/[locale]/(public)/ranks/`              |
| 無級                          | Mukyu — "no rank" (default)              | `MUKYU_SLUG` in `src/lib/db/data/ranks.ts`                                                                                        |
| 道場                          | Dojo — training hall                     | `src/app/[locale]/(public)/dojo/`                                                                                                 |
| 約束組手                      | Yakusoku Kumite — move-sequence practice | `src/app/[locale]/(public)/practice/(free-play)/move-sequence/`                                                                   |
| 合法手                        | legal move                               | `src/app/[locale]/(public)/practice/(challenge)/legal-moves/`                                                                     |
| 正解手 / 代替正解             | solution move / alternative solution     | `puzzleSolutions` table in `src/lib/db/schema/tables.ts`; `src/app/[locale]/(public)/practice/(free-play)/puzzle/`                |
| パズル                        | puzzle                                   | `src/app/[locale]/(public)/practice/(free-play)/puzzle/`, `src/app/admin/positions/puzzle/`                                       |
| ポジション記憶                | position memory                          | `src/app/[locale]/(public)/practice/(free-play)/position-memory/`                                                                 |
| ルートプランナー              | route planner                            | `src/app/[locale]/(public)/practice/(challenge)/route-planner/`                                                                   |
| ダイアゴナルクイズ            | diagonal quiz                            | `src/app/[locale]/(public)/practice/(challenge)/diagonal-quiz/`                                                                   |
| 座標クイズ                    | coordinate quiz                          | `src/app/[locale]/(public)/practice/(challenge)/coordinate-quiz/`                                                                 |
| マスの色                      | square colors                            | `src/app/[locale]/(public)/practice/(challenge)/square-colors/`                                                                   |
| ナイトツアー                  | knight tour                              | `src/app/[locale]/(public)/practice/(free-play)/knight-tour/`                                                                     |
| 経験値 / 経験値イベント       | experience points (Exp) / exp events     | `src/lib/db/save-exp.ts`, `src/lib/db/get-exp-info-by-source.ts`, `expEvents` / `userExp` tables in `src/lib/db/schema/tables.ts` |
| リーダーボード                | leaderboard                              | `src/app/[locale]/(public)/leaderboard/`, `src/lib/db/leaderboard-key.ts`                                                         |
| チャレンジモード / フリー対局 | challenge mode / free-play mode          | `src/app/[locale]/(public)/practice/(challenge)/`, `src/app/[locale]/(public)/practice/(free-play)/`                              |
| ミス上限 / 完走               | mistake limit / completion               | `MISTAKE_LIMIT` in `src/lib/challenge/constants.ts`                                                                               |
| 特典 / 権限付与               | benefit / user grant                     | `src/lib/user-grants.ts`, `src/app/admin/grants/`, `src/app/[locale]/(protected)/mypage/(confirmed)/benefits/`                    |
| モデレーション / 通報         | moderation / reporting                   | `moderationActions` table in `src/lib/db/schema/tables.ts`, `src/app/admin/`, `src/lib/ban.ts`                                    |
| 記事                          | article                                  | `src/app/admin/articles/`, `src/app/[locale]/(public)/articles/`, `articles` / `articleImages` tables                             |
| トピック / 投稿               | topic / post                             | `src/app/[locale]/(public)/topics/`, `topicPosts` table in `src/lib/db/schema/tables.ts`                                          |

Terms that map one-to-one onto standard chess vocabulary (盤面 = board, マス =
square, 駒 = piece, 手 = move, etc.) are intentionally omitted; they can be
looked up in any chess reference.

## Important Notes

- Prioritize performance and SEO in all decisions
- **Database schema** is defined in `src/lib/db/schema.ts` (Drizzle ORM). See TSDoc `@design` tags on each table for design rationale.
