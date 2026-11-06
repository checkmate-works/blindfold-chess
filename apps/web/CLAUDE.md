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

**Section namespaces:** a singular section may contain plural resource collections when the containment is real in the domain, not just organizational — e.g. `/mypage/coins` (personal section → wallet) and `/dojo/ranks` / `/dojo/guides` (belt-progression section → credentials / curriculum; migrated from top-level `/ranks` and `/guides/ranks/[rank]` in 2026-07 with 301s in `next.config.ts`). Inside such a namespace, drop scoping segments the namespace already provides (`/dojo/guides/5kyu`, not `/dojo/guides/ranks/5kyu`).

### Static Generation

- **`generateStaticParams` must return all dynamic segments** — For routes under `[locale]/`, always include `locale` in the returned params using `SUPPORTED_LOCALES` from `@/config`. Omitting `locale` causes "Page changed from static to dynamic at runtime" errors in production (the error does not surface in `next dev`).
- **No dynamic-API reads in the shared `[locale]` tree or in boundaries.** A single `headers()`/`cookies()` call anywhere in the always-mounted layout chain — or in a `loading.tsx`, `not-found.tsx`, or Suspense-fallback skeleton, which are prerendered as part of every route's shell — silently flips routes to dynamic with no build warning. This once disabled ALL static generation sitewide via one `headers()` read in `[locale]/not-found.tsx` (found by bisection, 2026-08). Rules that keep it safe:
  - Locale in boundaries: static routes' boundaries are Client Components (`useParams` / `useTranslations`); boundaries on inherently-dynamic routes may use `getLocaleFromPathnameHeader()` (see its TSDoc for the full decision table). `getLocale()` in a boundary does NOT see the layout's `setRequestLocale()` seed and falls back to the default locale — don't use it there.
  - Auth-dependent UI on static pages is client-side via `useAuth` (`SignUpBanner`, `RankAchievedBadge` pattern), never `getOptionalUser()` in a shared Server Component.
  - Viewer-independent data reads used by static pages must not go through `@/lib/supabase/server` (`cookies()`-bound); use Drizzle `db` + `unstable_cache` (see `leaderboard/_lib/get-public-leaderboard.ts` vs the `getLeaderboard` action).
  - The CSP layer never requires a nonce read in Server Components: the three constant inline bootstrap scripts (theme / ad-hide / announcement-dismiss) are allowed by `'sha256-...'` hashes (`@/lib/security/inline-script-hashes.ts`, hash-sync unit test), and prerendered content routes get a nonce-free CSP variant selected per path in `src/proxy.ts` (`@/lib/security/static-content-paths.ts` — keep its list in sync with the build's `●` routes).

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
  - `SITE_NAMES` is typed `Record<Locale, { seoSiteName; siteName }>`, so adding a locale to `SUPPORTED_LOCALES` without extending `SITE_NAMES` is a compile-time error — that compile-time exhaustiveness is preserved. A narrow runtime fallback (`?? SITE_NAMES[DEFAULT_LOCALE]`) exists only for URL-supplied `[locale]` segments outside `SUPPORTED_LOCALES`, because Next.js App Router invokes `generateMetadata` before any layout-level `notFound()` has a chance to run; without it, a stray URL like `/fr/...` or `/pt/...` turns a would-be 404 into a 500 inside metadata generation.
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
- **One client entry point** - Client code imports the wrappers in `@/i18n/` — `useSafeTranslations` (aliased to `useTranslations`) and `useSafeLocale` (aliased to `useLocale`) — never `useTranslations` or `useLocale` from `next-intl`; a lint rule enforces it. Server Components keep using `getTranslations` / `getLocale` from `next-intl/server`. See "next-intl's Client Hooks Are Lint-Banned" below for the reason and for what it means for test mocks.
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

- **Unit Tests** - Co-located with source files using `.test.ts` or `.test.tsx` extension (e.g., `src/app/[locale]/(public)/games/play/_lib/move-sorter.test.ts`), or in a `__tests__/` directory next to the module. There is no E2E suite; runtime checks are driven by hand with the `verify` skill (`.claude/skills/verify/SKILL.md`).
- **Convention tests** - A few tests scan the source tree instead of calling code and fail with a message that says what to change: `src/lib/use-server-type-imports.test.ts`, `src/lib/isr-user-scope-guard.test.ts`, `src/app/_layouts/game-preferences-coverage.test.ts`, `src/messages/parity.test.ts`.

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
- **Result shape** — A new or migrated Server Action that reports success or failure as a value returns `ActionResult<T, E>` from `@/lib/action-types` (`{ success: true } & T | { error: E }`), and callers narrow with `'error' in result`. Name the error codes in `E` when the client switches on them; keep the existing codes and success payload when migrating. The `ok`-flagged unions in `src/lib/**` and in pure helpers are a different layer and stay as they are — convert them at the action boundary (see `repertoires/[id]/_actions/addLine.ts`). Out of scope: read-only, `void`, `redirect`-on-success and status-polling actions, and the existing `{ success: false; error }` responses (games/shared, practice result saves, game comments/chunks). Those last ones are emitted by `handleServerActionError` and consumed via `res.success` and the `use-chunk-link-staging` callback contract, so they can only move together; do not adopt that shape for new actions.

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

### `revalidatePath` Is Lint-Banned by Default

The `ban/revalidate-path` rule (`revalidatePathBan` in `packages/eslint-config`, applied by both `apps/web/eslint.config.mjs` and the repo-root config) blocks importing `revalidatePath` from `next/cache` (enforced in-editor and by the lint-staged pre-commit hook). Rationale:

- **Static routes rely on ISR intervals plus cache tags, not on-demand purges** — since 2026-08, ~50 route patterns under `[locale]/` are SSG/ISR (content pages: faq/privacy/terms, glossary, learn, dojo, practice tops/tutorials, articles, …) with a seven-day default `revalidate` (declared in `[locale]/layout.tsx`, but the effective value is the minimum over every data-cache entry the render reads — the banner query in `<Header>` is the real ceiling, and `/practice` sits at 1h for the Daily Puzzle; read the build's route table, not the declarations). Their staleness budget is deliberate: content that must surface sooner is tag-driven — admin announcement mutations invalidate the `announcements` tag, which marks the affected pages stale so each re-renders on its next visit — so mutations still don't need `revalidatePath`. Auth/UGC/feed surfaces remain dynamic (`ƒ`), where there is no Full Route Cache entry to purge. (`src/app/admin/articles/_lib/revalidate-public.ts` predates this and covers the immediate-purge case for article slugs.)
- **Calling it inside a Server Action is not free even when it purges nothing**: Next.js re-renders the current page and embeds its RSC payload in the action response (measured 256 KB on the home feed), and wipes the client Router Cache. Full history: `@design` TSDoc in `src/lib/db/like-actions.ts`.
- **Before adding a disable, check two things**: (1) is the target page actually cached (SSG/ISR)? (2) does the calling client component already `router.refresh()`/`push()`, or own the state via `useOptimistic`/local state? If neither applies and a server-rendered surface genuinely must re-render, add `// eslint-disable-next-line ban/revalidate-path -- <reason>` naming the concrete consumer that depends on it.
- **`revalidateTag` stays allowed** — it is the correct tool for `unstable_cache` tags — but inside a Server Action it pays the same current-page re-render + response-embed cost. Do NOT switch to it just to silence this rule; use it only when a tagged cache actually exists.
- Test files are exempt (they import the mocked `revalidatePath` to assert it is or is not called). The exemption lifts only this ban: the chess.js ban (`ban/chess-js`) still applies to tests, so a test builds positions through `@blindfold-chess/features/chess-core` rather than importing `chess.js`.

### `hover:underline` Is Lint-Banned Under `src/app`

A link whose only affordance is a hover-time underline is invisible as a link on a touch screen, so `hover:underline` in a class string is an ESLint error outside `admin/` (`ban/hover-underline`, from `hoverUnderlineBan` in `packages/eslint-config`). Use `TEXT_LINK_CLASSES` / `TEXT_LINK_MUTED_CLASSES` from `src/app/[locale]/_lib/link-classes.ts` — underline at rest plus focus ring. That module's TSDoc says where an underline is _not_ wanted (a label inside a clickable card, a navigation list such as the footer columns or a term list); a site in one of those exceptions keeps its pointer-only underline behind an `eslint-disable-next-line ban/hover-underline -- <exception>` that names the exception.

### next-intl's Client Hooks Are Lint-Banned

Client components and hooks get their translator from `useSafeTranslations` (`src/i18n/use-safe-translations.ts`) and their locale from `useSafeLocale` (`src/i18n/use-safe-locale.ts`), imported under the name they replace — `import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations'` — so the call site still reads `useTranslations('namespace')` / `useLocale()`. Importing `useTranslations` or `useLocale` from `next-intl` is an ESLint error (`ban/client-intl-hooks`, from `clientIntlHooksBan` in `packages/eslint-config`).

Both wrappers are drop-in: same signature, same return value. What they add is a guard for the window during HMR in which `NextIntlClientProvider` has been torn down but the subtree below it has already re-rendered — Turbopack does a full reload when `.env.local` changes, and next-intl's hooks throw on the `undefined` intl context instead of degrading, which surfaces as a dev-overlay error on an unrelated component. The wrappers detect that through `IntlAvailableContext`; `useSafeTranslations` returns a translator that echoes the key, and `useSafeLocale` recovers the locale from `window.location.pathname` (matched against `SUPPORTED_LOCALES`, not a two-letter shape — that shape silently dropped `pt-BR`). In production the provider is always mounted, so the cost is one `useContext` per hook.

Two exemptions, both narrow: a wrapper may import the hook it wraps, and `import type { useTranslations } from 'next-intl'` is allowed — `@/i18n/translator` and `@/lib/i18n/localize-action-error` derive the shape of `t` from it, and a type cannot throw at runtime. Server Components are not involved at all: they call `getTranslations` / `getLocale` from `next-intl/server`, a different module the rule does not touch.

**In tests this matters more than it looks.** `IntlAvailableContext` defaults to `false` and nothing under jsdom mounts the provider that flips it, so a wrapper always takes its fallback branch and never reaches next-intl. A `vi.mock('next-intl')` therefore does not intercept a component that uses the wrapper, and the component renders the fallback's dotted `namespace.key` rather than the bare key — or, for the locale, whatever the jsdom URL's first path segment yields. Mock `@/i18n/use-safe-translations` instead — bare, to pick up the shared identity translator in `src/i18n/__mocks__/`, or with a factory when the copy is what the test is about. A `next-intl` mock is still needed only for what the wrappers do not cover, such as `useFormatter`.

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

### Specs are scaffolding, not artifacts

A `specs/<feature>/` directory is a thinking aid for building something, not a record of it. **Delete it in the same branch that finishes the feature**, after doing three things:

1. Move the parts that cannot be re-derived from the code — external platform behaviour, and choices deliberately _not_ taken — into TSDoc next to the code they constrain.
2. Move any still-unimplemented phase into a GitHub issue, verbatim, so the issue stands on its own.
3. Leave no comment pointing at `specs/...`. `SPEC*.md` is in `.gitignore`, so those files exist only on their author's machine — a reference to one is already broken for every other reader. This is the strictest case of "Comments explain; external references only cite" (root `CLAUDE.md`), which governs Sentry and GitHub issue references too.

Delete the build steps, deliverable lists, acceptance checklists, progress checkboxes, and "where the existing parts live" tables outright: the code, its tests, and git history are the source of truth, and a table of file paths rots silently. Keep only the _why_, and keep it beside the code rather than in a file of its own — otherwise documentation grows linearly with every feature.

## Where the rest is written down

This file holds the conventions that apply to every change under `apps/web`.
Feature designs and operational notes live next to what they describe, so a
task loads only its own:

| Topic                                                                         | Where                                                                                                                                                             |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local Supabase stack, keys, database migrations                               | `docs/local-development.md` (never `drizzle-kit push`; schema lives in `src/lib/db/schema/*.ts`, one file per domain)                                             |
| Deployment, Preview databases (Supabase Branching)                            | `docs/deployment.md`, `docs/preview-deployments.md`                                                                                                               |
| AI engines, the Maia model file, the Vercel spending cap                      | `docs/ai-engines.md`; the cache-key rule for a new model version is on `ALLOWED_FILES` in `src/app/api/engines/maia/[file]/route.ts`                              |
| Practice modules (練習の種類): the complete add-a-module checklist            | TSDoc of `src/lib/practice/registry.ts`                                                                                                                           |
| Belt ranks (段級位): layer map, triggers, adding a rank or a requirement type | TSDoc of `src/lib/db/rank-evaluation.ts`; definitions in `src/lib/db/data/ranks.ts`                                                                               |
| Moderation and audit log                                                      | `@design` TSDoc on `moderationActions` in `src/lib/db/schema/moderation.ts`                                                                                       |
| User grants (権限付与), ad-free sources                                       | TSDoc of `src/lib/users/user-grants.ts` and on `userGrants` in `src/lib/db/schema/grants.ts`; `src/lib/ads/ad-free-entitlement.ts` is the single ad-free decision |
| Coin / points naming                                                          | `src/lib/points/CLAUDE.md`                                                                                                                                        |
| Kata / repertoire naming                                                      | `src/lib/repertoires/CLAUDE.md`                                                                                                                                   |
| Articles and the Tiptap editor                                                | `src/app/admin/articles/CLAUDE.md`                                                                                                                                |
| Game operation audit record (peeks / undos)                                   | module TSDoc of `src/lib/games/saved-game-types.ts`; invariants in `games/play/_hooks/use-move-operation-tracker.invariants.test.ts`                              |
| The `redirect()`-under-Suspense hydration crash                               | `@knownIssue` TSDoc on `src/app/[locale]/(protected)/layout.tsx` (what was tried, what not to retry)                                                              |
| CSP nonce regression on Next.js upgrades                                      | `src/lib/security/csp-loading-chunk-nonce.test.ts`; static-route list and the build route-table format in `src/lib/security/static-content-paths.ts`              |
| Runtime verification (dev server, Playwright, seeding)                        | `.claude/skills/verify/SKILL.md`                                                                                                                                  |
| Everything operational (auth, Stripe, SMTP, cron, erasure)                    | `README.md` → `docs/*.md`                                                                                                                                         |

## Glossary (Japanese ↔ English)

The app was designed in Japanese and the team still names several features in
Japanese. Search for the English identifier; the owning `page.tsx` or module
TSDoc starts with `Feature Name (日本語名)` so the Japanese term is also
greppable there. Terms that map one-to-one onto standard chess vocabulary
(盤面 = board, マス = square, 駒 = piece, 手 = move) are omitted.

| Japanese                                                                                               | English identifier                                                                                       | Notes                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 実績 / 実績バッジ                                                                                      | achievement / achievement badge                                                                          |                                                                                                                                                                                                                                                                            |
| 感想戦                                                                                                 | recall (`/practice/recall`)                                                                              |                                                                                                                                                                                                                                                                            |
| 型                                                                                                     | Kata (UI) / repertoire (code)                                                                            | UI copy says Kata, code and keys say repertoire — `src/lib/repertoires/CLAUDE.md`                                                                                                                                                                                          |
| 目隠しチェス / 心眼チェス                                                                              | blindfold chess / Shingan Chess (brand)                                                                  | "Title Suffix Rule" above                                                                                                                                                                                                                                                  |
| 段級位 / 昇級・昇段                                                                                    | rank (kyu/dan belt) / promotion                                                                          | `rank`, `userRanks`, `RankRequirement`, `rank-evaluation.ts`. A player is promoted to 1kyu/1dan by **publishing** a qualifying game, not by "claiming": `claim` in this codebase means attaching an anonymous game to an account (`play.claim.*`, `claim-shared-game`)     |
| 次にやること（道場）                                                                                   | next rank / publish nudge                                                                                | `/dojo` computes it from `resolveNextRank` (`dojo/ranks/_lib/rank-progression.ts`) and `PublishNudgeBanner` (`games/_components`, i18n `home.gameList.publishNudge`)                                                                                                       |
| 無級                                                                                                   | Mukyu — "no rank" default (`MUKYU_SLUG`)                                                                 |                                                                                                                                                                                                                                                                            |
| 道場                                                                                                   | Dojo (`/dojo`)                                                                                           |                                                                                                                                                                                                                                                                            |
| 教本                                                                                                   | guide (code) / 教本 (ja UI, NOT ガイド)                                                                  | `/dojo/guides`, `buildGuidePath`, `guides.*` keys; every ja string for this feature says 教本 (unified 2026-07-21). Unrelated features that use the generic ガイド (getting-started, articles, manual, `/learn`) keep it                                                   |
| 約束組手                                                                                               | (retired)                                                                                                | The move-sequence practice no longer exists; no code reads `move_sequence`, only the `practiceMenuTypes` label in `messages/*.json` remains                                                                                                                                |
| 合法手                                                                                                 | legal move (`legal-moves`)                                                                               |                                                                                                                                                                                                                                                                            |
| 正解手 / 代替正解                                                                                      | solution move / alternative solution                                                                     | `puzzleSolutions` in `src/lib/db/schema/puzzles.ts`                                                                                                                                                                                                                        |
| パズル / ポジション記憶 / ルートプランナー / ダイアゴナルクイズ / 座標クイズ / マスの色 / ナイトツアー | puzzle / position memory / route planner / diagonal quiz / coordinate quiz / square colors / knight tour | Practice modules; the registry lists their slugs                                                                                                                                                                                                                           |
| 経験値                                                                                                 | experience points (Exp) / `expEvents`                                                                    | Not the coin economy                                                                                                                                                                                                                                                       |
| コイン / ポイント                                                                                      | coin (facing) / points (ledger)                                                                          | `src/lib/points/CLAUDE.md`                                                                                                                                                                                                                                                 |
| リーダーボード                                                                                         | leaderboard                                                                                              |                                                                                                                                                                                                                                                                            |
| チャレンジモード / フリー対局                                                                          | challenge mode / free-play mode                                                                          | route groups `practice/(challenge)/` and `practice/(free-play)/`                                                                                                                                                                                                           |
| ミス上限 / 完走                                                                                        | mistake limit / completion (`MISTAKE_LIMIT`)                                                             |                                                                                                                                                                                                                                                                            |
| 特典 / 権限付与                                                                                        | benefit / user grant                                                                                     |                                                                                                                                                                                                                                                                            |
| モデレーション / 通報                                                                                  | moderation / reporting                                                                                   | `moderationActions`, `src/lib/moderation/ban.ts`                                                                                                                                                                                                                           |
| 記事                                                                                                   | article                                                                                                  |                                                                                                                                                                                                                                                                            |
| トピック / 投稿                                                                                        | topic / post (`topicPosts`)                                                                              |                                                                                                                                                                                                                                                                            |
| チャンク                                                                                               | chunk (piece-coordination pattern)                                                                       |                                                                                                                                                                                                                                                                            |
| 提案募集中 / 公開済み                                                                                  | draft / published (chunk lifecycle)                                                                      | Stored values stay `draft` / `published`; no user-facing string says 下書き / "Draft" for a chunk — the `status` TSDoc on the `chunks` table says why. Within the chunk feature 下書き only means the unsaved sessionStorage authoring draft (`ChunkDraftV1`)              |
| 下書き (型)                                                                                            | draft kata (`repertoires.status = 'building'`)                                                           | `src/lib/repertoires/CLAUDE.md`                                                                                                                                                                                                                                            |
| 編集リクエスト                                                                                         | chunk edit request (`chunkEditRequests`)                                                                 |                                                                                                                                                                                                                                                                            |
| 設定（盤面の見た目）                                                                                   | game preferences                                                                                         | `GamePreferencesContext` (web-only, localStorage + cookie hint); per-module practice settings use `useLocalStorageSettings`, the web adapter of `usePersistentSettings` from `@blindfold-chess/features/common/client`. Mobile has its own store — `apps/mobile/CLAUDE.md` |

## Known Issues

### `next dev` rewrites CLAUDE.md and reformats build output (16.3.0)

Two things 16.3.0 does that look like breakage but are not:

- **`next dev` appends an agent-rules block — fenced by
  `BEGIN:nextjs-agent-rules` / `END:nextjs-agent-rules` HTML comments — to
  `CLAUDE.md`** (written by `node_modules/next/dist/server/lib/generate-agent-files.js`).
  It reappears after every `next dev`, so a dirty `CLAUDE.md` right after
  starting the dev server is expected, not a stray edit. The generator finds
  the block with a plain `indexOf` of the FIRST occurrence of the full marker
  comment, so this file must never spell either marker out verbatim outside
  the real block: prose that does becomes the "start of the block" and
  everything from it down to the real block is deleted on the next `next dev`
  (reproduced 2026-08-07 — this bullet used to quote the opening marker and
  lost the two sections below it).
- **The build's route table prints its `○ ● ƒ` markers on each generated
  child path, not on the parent route line.** A script that scrapes
  `^[├└] ●` reports every SSG route as lost; how to normalise the two shapes
  is in the TSDoc of `src/lib/security/static-content-paths.ts`, the list that
  must stay in sync with the `●` routes.

## Important Notes

- Prioritize performance and SEO in all decisions
- **Database schema** is defined per domain under `src/lib/db/schema/` (`ranks.ts`, `posts.ts`, …; `src/lib/db/schema.ts` only re-exports). See TSDoc `@design` tags on each table for design rationale.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
