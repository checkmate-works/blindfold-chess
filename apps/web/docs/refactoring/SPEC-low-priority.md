# Refactoring SPEC: Low Priority

This document describes low-priority refactoring tasks for `apps/web/src/`.
Each task is self-contained with enough context for an AI agent to implement independently.

---

## C1: Split `PublicProfilePage` (373 lines)

### Problem

The public profile page is too large and mixes data-fetching, follow logic, pagination, and all rendering in a single component. Additionally, `generateMetadata` and the page component make nearly identical DB queries.

### File

`src/app/[locale]/(public)/profile/[username]/page.tsx` (373 lines)

### Specific Issues

1. **Duplicated DB query:** `generateMetadata` queries the profile, then the main component makes an almost identical query with more fields. Extract a shared `getProfileByUsername()` query function.
2. **Social links rendering:** ~80 lines of repetitive external-link rendering (FIDE, Chess.com, Lichess, X, Instagram, YouTube) follows an identical pattern. Extract a `SocialLinks` component.
3. **Posts section:** The posts listing with pagination could be extracted into a `ProfilePosts` component.

### Implementation Steps

1. Read the full page file
2. Extract `getProfileByUsername()` to `_lib/queries.ts` in the same route directory
3. Create `_components/SocialLinks.tsx` with the link rendering logic
4. Create `_components/ProfilePosts.tsx` for the posts section
5. Update `page.tsx` to use these extracted modules
6. Run `pnpm typecheck` and `pnpm test`

---

## C2: Refactor `ProfileForm` Validation

### Problem

The `ProfileForm` component has 6 nearly identical validation blocks, each checking `field.trim() && !/regex/.test(field.trim())`. Regex patterns are inline magic strings with no explanation.

### File

`src/app/[locale]/(protected)/mypage/(confirmed)/profile/_components/ProfileForm.tsx`

### Specific Issues

1. **Lines 40-68:** Six repetitive validation blocks
2. **Lines 103-136:** Parallel switch statement mapping error codes to messages
3. **Inline regex patterns** with no named constants or documentation

### Implementation Approach

1. Define a validation rules array: `{ field: string, regex: RegExp, errorKey: string }[]`
2. Extract regex patterns to named constants (e.g., `CHESS_USERNAME_PATTERN`, `SOCIAL_HANDLE_PATTERN`)
3. Replace the repetitive blocks with a loop over the rules
4. Simplify the error code mapping with a lookup object
5. Run `pnpm typecheck` and `pnpm test`

---

## C3: Replace Hardcoded Colors in Admin Area

### Problem

The CLAUDE.md explicitly states "No Hardcoded Colors -- Use CSS variable-based utilities instead of direct color classes". However, the admin area has 40+ instances of hardcoded Tailwind color classes.

### Common Patterns Found

- `bg-red-100 text-red-800` -- danger/error badges
- `bg-green-100 text-green-800` -- success badges
- `bg-yellow-100 text-yellow-800` -- warning badges
- `bg-red-600 text-white` -- danger buttons
- `text-red-600 text-sm` -- error messages (9 occurrences)

### Affected Files (13+)

Search for these patterns with:

```bash
grep -r "bg-red-\|bg-green-\|bg-yellow-\|text-red-\|text-green-\|text-yellow-" apps/web/src/app/admin/
```

### Implementation Approach

1. Define semantic status CSS variables in the theme system (`@blindfold-chess/ui`), or at minimum create utility classes in `globals.css`:
   - `bg-status-danger` / `text-status-danger` (red)
   - `bg-status-success` / `text-status-success` (green)
   - `bg-status-warning` / `text-status-warning` (yellow)
2. Alternatively, create a `StatusBadge` component with `variant` prop (`danger | success | warning | info`)
3. Replace all hardcoded color classes across admin files
4. Verify dark mode still works correctly
5. Run `pnpm typecheck`

---

## C4: Standardize Error Message Display

### Problem

Error messages use inconsistent styling:

- Admin components: `<p className="text-red-600 text-sm">` (9 occurrences)
- Main app: `<p className="mt-2 text-sm text-destructive">` (semantic class)

### Affected Files

Search with:

```bash
grep -rn "text-red-600.*text-sm\|text-sm.*text-red-600" apps/web/src/
```

### Implementation Steps

1. Replace all `text-red-600` error messages with `text-destructive` (the semantic class already exists)
2. Optionally create a shared `ErrorMessage` component:
   ```tsx
   function ErrorMessage({ children }: { children: React.ReactNode }) {
     return <p className="mt-2 text-sm text-destructive">{children}</p>;
   }
   ```
3. Run `pnpm typecheck`

---

## C5: Replace Custom Toast in ArticleForm with ToastContext

### Problem

`ArticleForm` implements its own toast mechanism with `useState` + `setTimeout(() => setToastMessage(null), 3000)` instead of using the existing `ToastContext`.

### File

`src/app/admin/articles/_components/ArticleForm.tsx` (line ~165)

### Implementation Steps

1. Read the existing `ToastContext` implementation (search for `useToast` or `ToastContext` in `src/`)
2. In `ArticleForm`, replace the manual `toastMessage` state and `setTimeout` with `useToast().showToast(...)`
3. Remove the custom toast rendering JSX from the component
4. Run `pnpm typecheck` and `pnpm test`
