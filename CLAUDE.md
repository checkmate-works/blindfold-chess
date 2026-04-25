# Blindfold Chess Monorepo

## Monorepo Structure

This project is a pnpm + Turborepo monorepo.

### Apps

| App        | Path          | Description                                                                            |
| ---------- | ------------- | -------------------------------------------------------------------------------------- |
| **web**    | `apps/web`    | Next.js web application (App Router, SSR, i18n). See `apps/web/CLAUDE.md` for details. |
| **mobile** | `apps/mobile` | React Native (Expo) mobile application                                                 |

### Packages

| Package                            | Path                     | Description                                                                                                                |
| ---------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **@blindfold-chess/types**         | `packages/types`         | Shared TypeScript type definitions (chess pieces, board, etc.)                                                             |
| **@blindfold-chess/features**      | `packages/features`      | Platform-independent game logic and algorithms (coordinate quiz, diagonal quiz, legal moves, route planner, AI game, etc.) |
| **@blindfold-chess/ui**            | `packages/ui`            | Shared UI theme — color definitions for light/dark mode, CSS generation via `generateThemeCSS()`                           |
| **@blindfold-chess/icons**         | `packages/icons`         | Cross-platform SVG icon components. See `packages/icons/CLAUDE.md` for architecture and how to add icons.                  |
| **@blindfold-chess/eslint-config** | `packages/eslint-config` | Shared ESLint configuration                                                                                                |

### Key Design Principles

- **Platform independence in packages**: Packages under `packages/` should not depend on platform-specific APIs. Platform adaptation is handled at the app level or via conditional exports (e.g., `@blindfold-chess/icons` uses the `exports` field in package.json to switch between web and native renderers).
- **Theme unification**: Theme colors are defined once in `@blindfold-chess/ui` and shared across web and mobile. Web injects them as CSS custom properties via `generateThemeCSS()`; mobile uses them directly as JavaScript values.
- **chess.js isolation**: The external library `chess.js` must only be imported within `packages/features/src/chess-core/`. Apps (`apps/web`, `apps/mobile`) must use `@blindfold-chess/features/chess-core` instead of importing `chess.js` directly. This keeps the dependency isolated behind a stable, typed API and makes it possible to replace or upgrade `chess.js` with changes confined to one module.

### Server / Client Boundary Rule for `packages/features`

`packages/features` is consumed by both `apps/web` (Next.js App Router with React Server Components) and `apps/mobile` (Expo / Metro). To avoid pulling React-hook code into Server Components and to keep bundle size honest, the package follows a **pure / client split** at every barrel:

1. **Every React hook source file MUST start with `"use client";`** on line 1, before any imports. This applies to any file that imports from `react` and uses `useState`/`useEffect`/`useRef`/`useCallback`/`useMemo`/`useReducer`/etc.
2. **Barrel files (`index.ts`) MUST be single-kind.** A barrel either re-exports only pure modules (no React, no DOM, no platform globals) OR only client modules — never both.
3. **For features that have hooks, ship two barrels per directory:**
   - `<feature>/index.ts` — pure barrel, no `"use client"`. Re-exports types, constants, validators, pure logic. Type-only re-exports of hook return shapes (`export type { UseXxxReturn }`) are allowed here because types erase at compile time.
   - `<feature>/client.ts` — client barrel, starts with `"use client";`. Re-exports the React hooks (and any client-only utilities).
4. **Expose both via `package.json#exports`** as `"./<feature>"` and `"./<feature>/client"`. Apps import the path that matches the consumer's environment.
5. **Inside `packages/features`, intra-package imports SHOULD prefer deep paths** (`./use-foo`, `../common/flash-policy`) over barrel imports, to keep the boundary explicit and to avoid re-introducing the same coupling.
6. **Mobile compatibility:** Metro treats `"use client"` as a no-op directive prologue, so this rule is invisible to the React Native target — no special handling needed there.

Why: a single mixed barrel forces every Server Component that touches one helper to load the entire module graph of every other re-export. The directive on the leaf hook file is necessary but not sufficient — the boundary check fires on the unmarked barrel that statically imports the hook. The two-barrel split is the smallest structural change that makes the boundary unambiguous and enforceable in review. Reproduced 2026-04-25 as `useEffect into a React Server Component module` from the landing page Footer chain (`Footer → @/app/_components → BoardLayout → @blindfold-chess/features/common → use-persistent-settings.ts`).

## Development

- **Package manager**: pnpm (v10)
- **Build orchestration**: Turborepo
- **Node.js**: >=24.0.0 <25
- **Scripts**: `pnpm build`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`
