# Refactoring SPEC: Medium Priority

This document describes medium-priority refactoring tasks for `apps/web/src/`.
Each task is self-contained with enough context for an AI agent to implement independently.

---

## B1: Practice Session/Challenge/Training Page Factory

### Problem

21 page files follow an identical boilerplate pattern: extract locale, call `setRequestLocale`, call `getTranslations`, render `PracticeSessionPage` with breadcrumbs, and wrap a dynamically-imported component. The only differences are the i18n key, the canonical path, and the inner component.

### Affected Files

**Challenge pages (6):**

- `src/app/[locale]/(public)/practice/coordinate-quiz/challenge/page.tsx`
- `src/app/[locale]/(public)/practice/diagonal-quiz/challenge/page.tsx`
- `src/app/[locale]/(public)/practice/legal-moves/challenge/page.tsx`
- `src/app/[locale]/(public)/practice/square-colors/challenge/page.tsx`
- `src/app/[locale]/(public)/practice/quadrants/challenge/page.tsx`
- `src/app/[locale]/(public)/practice/route-planner/challenge/page.tsx`

**Challenge session pages (4):**

- `src/app/[locale]/(public)/practice/coordinate-quiz/challenge/session/page.tsx`
- `src/app/[locale]/(public)/practice/diagonal-quiz/challenge/session/page.tsx`
- `src/app/[locale]/(public)/practice/legal-moves/challenge/session/page.tsx`
- `src/app/[locale]/(public)/practice/square-colors/challenge/session/page.tsx`

**Training pages (4):**

- `src/app/[locale]/(public)/practice/coordinate-quiz/training/page.tsx`
- `src/app/[locale]/(public)/practice/diagonal-quiz/training/page.tsx`
- `src/app/[locale]/(public)/practice/legal-moves/training/page.tsx`
- `src/app/[locale]/(public)/practice/square-colors/training/page.tsx`

**Plus additional session pages under `*/session/page.tsx`**

### Existing Pattern to Follow

A factory function `createSimplePracticeResultPage` already exists and is used by 8 of 12 result pages. Follow the same approach.

**Reference:** Look at how `createSimplePracticeResultPage` works (search for it in `apps/web/src/app/[locale]/(public)/practice/`), and create analogous factories:

- `createPracticeChallengePage({ i18nKey, canonicalPath, breadcrumbSegments, Component })`
- `createPracticeChallengeSessionPage({ ... })`
- `createPracticeTrainingPage({ ... })`

### Implementation Steps

1. Identify the common structure by comparing 2-3 challenge pages side by side
2. Create factory function(s) in `src/app/[locale]/(public)/practice/_lib/` (or next to the existing factory)
3. Replace each page file with a call to the factory
4. Run `pnpm typecheck` and `pnpm test` from the monorepo root to verify

---

## B2: Extend Result Page Factory to Remaining 4 Pages

### Problem

4 of 12 practice result pages manually implement the same page structure instead of using the existing `createSimplePracticeResultPage` factory.

### Affected Files

- `src/app/[locale]/(public)/practice/coordinate-quiz/result/page.tsx`
- `src/app/[locale]/(public)/practice/legal-moves/result/page.tsx`
- `src/app/[locale]/(public)/practice/square-colors/result/page.tsx`
- `src/app/[locale]/(public)/practice/position-memory/result/page.tsx`

### Why They Were Not Converted

- `coordinate-quiz` and `legal-moves` fetch leaderboard data server-side and pass specific search params (orientation/piece)
- `position-memory` is nearly identical to the simple factory output and should be convertible as-is

### Implementation Steps

1. Read the existing `createSimplePracticeResultPage` factory to understand its API
2. Extend the factory with optional config for:
   - Leaderboard pre-fetching
   - Search param extraction (orientation, piece, etc.)
3. Convert `position-memory` first (simplest case) to validate the approach
4. Convert `coordinate-quiz`, `legal-moves`, and `square-colors`
5. Run `pnpm typecheck` and `pnpm test`

---

## B3: Pagination Utility Consolidation

### Problem

Pagination is implemented at least 3 different ways across the codebase:

1. `paginate()` in `src/app/[locale]/(public)/topics/_lib/pagination.ts` -- only used by some topic pages
2. `getPaginationData()` in `src/app/admin/_lib/pagination.ts` -- admin-specific
3. Manual inline pagination math in several pages

### Affected Files

- `src/app/[locale]/(public)/topics/_lib/pagination.ts` -- existing utility (used by openings/squares sub-pages)
- `src/app/[locale]/(public)/topics/page.tsx` -- manual pagination (does NOT use `paginate()`)
- `src/app/[locale]/(public)/profile/[username]/page.tsx` -- manual pagination
- `src/app/admin/_lib/pagination.ts` -- separate admin utility
- `src/app/admin/activity-log/page.tsx` -- manual pagination (does NOT use admin utility)

### Implementation Steps

1. Compare the three implementations to find the common interface
2. Create a shared pagination utility in `src/lib/pagination.ts`
3. Migrate all pages to use the shared utility
4. Delete the now-redundant topic-specific and admin-specific utilities (or re-export from them for backward compatibility)
5. Run `pnpm typecheck` and `pnpm test`

---

## B4: Magic Numbers and Strings to Named Constants

### Problem

Several magic values are repeated across the codebase without named constants.

### Items

**B4-1: Starting FEN string (3 files)**

- `src/app/[locale]/(public)/games/play/postmortem/_hooks/use-postmortem-game.tsx` (line ~130)
- `src/app/[locale]/(public)/games/play/_hooks/use-game-initialization.ts` (line ~59)
- `src/lib/repositories.ts` (line ~227)
- A constant `STANDARD_START_FEN` already exists in `src/app/[locale]/(public)/games/play/_lib/pgn-parser.ts`
- **Fix:** Import from the existing location or from `@blindfold-chess/features/chess-core` (`getStartingFen()`)

**B4-2: `perPage: 100` in admin pages (3 files)**

- `src/app/admin/topic_posts/page.tsx`
- `src/app/admin/audit-log/page.tsx`
- `src/app/admin/activity-log/page.tsx`
- **Fix:** Extract to `src/app/admin/_lib/constants.ts` as `ADMIN_USER_FETCH_PAGE_SIZE`

**B4-3: `PAGE_SIZE = 5` in topic/profile pages (4+ files)**

- `src/app/[locale]/(public)/topics/page.tsx`
- `src/app/[locale]/(public)/topics/squares/page.tsx`
- `src/app/[locale]/(public)/topics/openings/[slug]/page.tsx`
- `src/app/[locale]/(public)/profile/[username]/page.tsx`
- **Fix:** Export `TOPIC_PAGE_SIZE` from `src/app/[locale]/(public)/topics/_lib/pagination.ts` or a shared location

### Implementation Steps

1. For each item, identify all occurrences using grep
2. Create/use the appropriate constants file
3. Replace all inline values with the named constant
4. Run `pnpm typecheck` and `pnpm test`

---

## B5: Topic Pages (Openings vs Squares) Shared Components

### Problem

The openings and squares topic pages share ~80% identical structure across 3 page types (list, detail, new post).

### Affected Files

**Post list pages:**

- `src/app/[locale]/(public)/topics/openings/[slug]/page.tsx` (177 lines)
- `src/app/[locale]/(public)/topics/squares/[square]/page.tsx` (183 lines)

**Post detail pages:**

- `src/app/[locale]/(public)/topics/openings/[slug]/posts/[postId]/page.tsx` (147 lines)
- `src/app/[locale]/(public)/topics/squares/[square]/posts/[postId]/page.tsx` (128 lines)

**New post pages:**

- `src/app/[locale]/(public)/topics/openings/[slug]/new/page.tsx`
- `src/app/[locale]/(public)/topics/squares/[square]/new/page.tsx`

### Implementation Approach

1. Diff each pair of corresponding pages to identify the exact differences
2. For list pages: create a `TopicListPage` layout component accepting topic header, post cards renderer, pagination config, sort tabs, and breadcrumb items
3. For detail pages: create a `TopicPostDetailPage` factory accepting topic-specific config (validation function, topic display resolver, i18n namespace, breadcrumb builder)
4. For new post pages: create a `NewTopicPostPage` factory
5. Both openings and squares pages should delegate to these shared components
6. Run `pnpm typecheck` and `pnpm test`

---

## B6: Admin CRUD Action Pattern Unification

### Problem

Admin delete/create/update actions for articles and announcements share identical structure with only table name and revalidation path differing.

### Affected Files

**Delete actions:**

- `src/app/admin/articles/_actions/deleteArticle.ts`
- `src/app/admin/announcements/_actions/deleteAnnouncement.ts`

**Create/Update actions:**

- `src/app/admin/announcements/_actions/createAnnouncement.ts`
- `src/app/admin/announcements/_actions/updateAnnouncement.ts`
- `src/app/admin/articles/_actions/createArticle.ts`
- `src/app/admin/articles/_actions/updateArticle.ts`

### Implementation Approach

1. Extract a generic `createAdminDeleteAction(table, revalidationPath)` factory in `src/app/admin/_lib/action-factories.ts`
2. For create/update: unify data types per entity (e.g., `AnnouncementMutationData`) and create `upsert` helpers
3. Each `"use server"` file keeps a thin async wrapper (required by Next.js) that delegates to the shared logic
4. **Important:** Follow the server action convention in CLAUDE.md -- re-exports are forbidden; use async wrapper pattern
5. Run `pnpm typecheck` and `pnpm test`
