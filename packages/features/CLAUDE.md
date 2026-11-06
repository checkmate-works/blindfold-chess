# @blindfold-chess/features

Platform-independent game logic and React hooks shared by `apps/web` (Next.js
App Router, React Server Components) and `apps/mobile` (Expo / Metro). One
directory per feature under `src/` (`coordinate-quiz/`, `diagonal-quiz/`,
`legal-moves/`, `route-planner/`, `ai-game/`, …) plus `common/` for board
geometry, countdown and result helpers, `chess-core/` for the chess.js
wrapper, and `practice-session/` for session hooks.

Nothing here may depend on a platform API (DOM, `window`, `AsyncStorage`,
Node). Platform adaptation happens in the apps, or through a port the hook
takes as an argument (`PersistentStorage` in `common/persistent-storage.ts`
is the model: web passes a localStorage adapter, mobile an AsyncStorage one).

## chess.js stays inside `src/chess-core/`

`chess.js` is imported only in `src/chess-core/`. Everything else, in this
package and in the apps, uses the typed API that `chess-core` exports
(`@blindfold-chess/features/chess-core` and its deep paths), so that upgrading
or replacing the library is a change to one module. ESLint enforces it
(`ban/chess-js`, from `chessJsBan` in `packages/eslint-config`; it
covers test files too — only `src/chess-core/` is exempt).

## Server / Client boundary: every barrel is single-kind

The package is consumed by Server Components. A barrel that re-exports a hook
drags React into every Server Component that imports any helper from the same
barrel, and the failure is a build error on an unrelated page (`useEffect into
a React Server Component module`, reproduced 2026-04-25 from the landing-page
Footer importing one pure helper through a mixed `common` barrel). Hence:

1. **Every React hook source file starts with `"use client";`** on line 1,
   before any import. This applies to any file that imports from `react` and
   calls `useState` / `useEffect` / `useRef` / `useCallback` / `useMemo` /
   `useReducer` / etc.
2. **Barrel files (`index.ts`) are single-kind.** A barrel re-exports only
   pure modules (no React, no DOM, no platform globals) OR only client
   modules, never both.
3. **A feature with hooks ships two barrels:**
   - `<feature>/index.ts` — pure barrel, no `"use client"`. Types, constants,
     validators, pure logic. `export type { UseXxxReturn }` is allowed here
     because types erase at compile time.
   - `<feature>/client.ts` — client barrel, starts with `"use client";`.
     Re-exports the hooks and any client-only utilities.
   - Exception: a directory that contains only hooks (e.g. `practice-session/`)
     may put `"use client";` on its single `index.ts` instead.
4. **Both barrels are exposed in `package.json#exports`** as `"./<feature>"`
   and `"./<feature>/client"`. Apps import the path that matches the
   consumer's environment.
5. **Inside this package, prefer deep imports** (`./use-foo`,
   `../common/flash-policy`) over barrel imports, so the boundary stays
   explicit.
6. **Mobile needs nothing special:** Metro treats `"use client"` as a no-op
   directive prologue.

The directive on the leaf hook file is necessary but not sufficient: the
boundary check fires on the unmarked barrel that statically imports the hook,
which is why rules 2–4 exist. `src/__tests__/no-react-in-pure-barrels.test.ts`
checks every pure barrel listed in it; add a new feature's pure barrel to that
list when you create one.

## Adding a feature directory

1. Create `src/<feature>/` with the pure modules and, if there are hooks, the
   `index.ts` / `client.ts` pair above.
2. Add the `exports` entries to `package.json` (the existing ones are the
   pattern; `./chess-core/*` shows deep paths).
3. Add the pure barrel to `PURE_BARRELS` in
   `src/__tests__/no-react-in-pure-barrels.test.ts`.
4. Tests live next to the module (`foo.test.ts`) or in `<feature>/__tests__/`.
   The convention tests are the only place that may touch Node APIs; see the
   comment at the top of the barrel test for why they `/// <reference>` the
   types per file instead of in `tsconfig.json`.
