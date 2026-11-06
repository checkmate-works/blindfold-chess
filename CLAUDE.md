# Blindfold Chess Monorepo

## Monorepo Structure

This project is a pnpm + Turborepo monorepo.

### Apps

| App        | Path          | Description                                                                            |
| ---------- | ------------- | -------------------------------------------------------------------------------------- |
| **web**    | `apps/web`    | Next.js web application (App Router, SSR, i18n). See `apps/web/CLAUDE.md` for details. |
| **mobile** | `apps/mobile` | React Native (Expo) mobile application                                                 |

### Packages

| Package                            | Path                     | Description                                                                                                                                                                         |
| ---------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **@blindfold-chess/types**         | `packages/types`         | Shared TypeScript type definitions (chess pieces, board, etc.)                                                                                                                      |
| **@blindfold-chess/features**      | `packages/features`      | Platform-independent game logic and algorithms (coordinate quiz, diagonal quiz, legal moves, route planner, AI game, etc.). See `packages/features/CLAUDE.md` for the barrel rules. |
| **@blindfold-chess/ui**            | `packages/ui`            | Shared UI theme — color definitions for light/dark mode, CSS generation via `generateThemeCSS()`                                                                                    |
| **@blindfold-chess/icons**         | `packages/icons`         | Cross-platform SVG icon components. See `packages/icons/CLAUDE.md` for architecture and how to add icons.                                                                           |
| **@blindfold-chess/eslint-config** | `packages/eslint-config` | Shared ESLint configuration                                                                                                                                                         |

### Key Design Principles

- **Platform independence in packages**: Packages under `packages/` should not depend on platform-specific APIs. Platform adaptation is handled at the app level or via conditional exports (e.g., `@blindfold-chess/icons` uses the `exports` field in package.json to switch between web and native renderers).
- **Theme unification**: Theme colors are defined once in `@blindfold-chess/ui` and shared across web and mobile. Web injects them as CSS custom properties via `generateThemeCSS()`; mobile uses them directly as JavaScript values.
- **chess.js isolation**: The external library `chess.js` is imported only within `packages/features/src/chess-core/`. Apps and other feature modules use `@blindfold-chess/features/chess-core` instead, so that replacing or upgrading `chess.js` stays confined to one module. ESLint enforces it (`chessJsBan` in `packages/eslint-config`).
- **Each lint ban owns its rule name**: the project's bans (`revalidatePath`, `chess.js`, next-intl client hooks, `hover:underline`) are registered as `ban/<name>` in `packages/eslint-config/ban-plugin.js` instead of setting `no-restricted-imports` / `no-restricted-syntax` directly. Flat config replaces a rule's options wholesale when a later config object sets the same rule name, so two bans on one rule name silently cancel each other. A new ban gets its own `ban/*` rule, is applied in both the package config and the repo-root config (lint-staged lints from the root), and gets cases in `packages/eslint-config/test/bans.test.mjs`. Disables name the ban: `// eslint-disable-next-line ban/revalidate-path -- <reason>`.

### Server / Client Boundary Rule for `packages/features`

Every barrel in `packages/features` is single-kind: a feature with hooks ships
a pure `index.ts` and a `"use client"` `client.ts`, both listed in
`package.json#exports`, and every hook file starts with `"use client";`. The
full rule, the reason, and the checklist for a new feature directory are in
`packages/features/CLAUDE.md`; `src/__tests__/no-react-in-pure-barrels.test.ts`
enforces it.

## Comments explain; external references only cite

A comment must make its point without the reader opening anything else. The
things a comment is tempted to point at all decay faster than the code they
annotate: Sentry issues get resolved, merged, or age out of retention; a GitHub
issue is closed and its context collapses to a title; `SPEC*.md` is gitignored
and therefore never existed for anyone but its author. An explanation that
lives at the far end of one of those links goes silent when the link does, and
it goes silent invisibly — the comment still _reads_ fine.

What matters is the job the reference is doing:

- **Citation — allowed, and worth having.** The comment explains the mechanism
  in full, and the reference is appended as the source for the one claim code
  cannot re-derive: that this actually happened in production, on which
  browsers, how often. Put it after the explanation is complete, ideally in its
  own trailing sentence or paragraph. Never open with it — a leading ID makes
  the tracker the subject of the sentence. The model to copy is the
  `unhandledrejection` filter in `apps/web/src/instrumentation-client.ts`.
- **Forward pointer — allowed.** `Tracking: GitHub issue #89` next to a
  deliberately-weakened check names where the remaining work lives. Nothing is
  being explained, so nothing is lost if the issue disappears — the pointer
  _is_ the content.
- **Delegation — never.** "See BLINDFOLD-CHESS-5N for why", "see
  specs/foo/SPEC2.md". Move the reasoning into the comment. If it is too long
  to sit inline, it belongs in TSDoc on the declaration it constrains — still
  in this repo, still versioned with the code it describes.

The same test applies to names. A `describe('Phase 13 (#83) …')` block or a
constant named after a ticket means nothing to a reader without the tracker
open; name it for the behaviour and append the reference if it is worth citing.

Referencing a spec file is the one case that is never a citation either: it is
already unreachable for every other reader. See "Specs are scaffolding, not
artifacts" in `apps/web/CLAUDE.md` for what to do with a spec's contents
instead.

## Development

- **Package manager**: pnpm (v10)
- **Build orchestration**: Turborepo
- **Node.js**: >=24.0.0 <25
- **Scripts**: `pnpm build`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`

### TypeScript versions are not uniform across the workspace

Three different compilers are installed on purpose. Before changing any of
them, know which constraint you are about to break.

| Where                                            | Version                          | Why                                                                                                |
| ------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/web`, `packages/{features,icons,types,ui}` | `^7.0.2`                         | The default. TypeScript 7, the Go compiler.                                                        |
| `packages/eslint-config`                         | `npm:@typescript/typescript6@^6` | typescript-eslint hard-errors under TS7. See the TSDoc in its `base.js`.                           |
| `apps/mobile`                                    | `~5.9.3`                         | Expo loads the TypeScript JS API in-process, which TS7 does not ship. See `apps/mobile/CLAUDE.md`. |

The mobile pin is the one that is easy to "fix" by mistake: `tsc --noEmit`
passes under TS7 and only `expo start` fails. The failure mode and the
versions it was verified against are in `apps/mobile/CLAUDE.md`.
