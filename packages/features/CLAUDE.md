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

## Mutation testing

`pnpm mutation` runs `@mizchi/mutator` (configured in `mutator.config.ts`): it
rewrites the source by rule, one mutant at a time, and checks whether a test
fails (Killed) or everything still passes (Survived).

Why measure it:

- **Coverage only counts what ran.** It cannot tell whether breaking that line
  would make any test fail; a mutation score measures exactly that.
- **Whoever wrote the tests — an agent included — picks the breakage when they
  "break it on purpose to check".** Self-review is no substitute; the
  rewrites have to come from an outside tool.
- **A high score does not prove the tests are enough.** Mutants come from
  substitution rules (operators, comparisons, booleans, strings, …), so
  reordered statements or swapped variables are never tried.

Scope and placement:

- **Only the pure modules here are mutated.** Their tests are IO-free and run
  in milliseconds under node, which is what re-running them per mutant needs.
  Hooks (`src/**/use-*.ts`) and the client barrels (`src/**/client.ts`) are
  excluded: hook tests start jsdom and `renderHook` per file, and only about
  half the hooks have tests, so the rest would show up as NoCoverage and
  muddy the number for the pure logic. `apps/web` is left out because its
  tests are mock-heavy under jsdom — killing a mutant against a mock says
  little about quality — and `packages/ui` because its single test file would
  leave mostly string mutants of colour constants.
- **Not a turbo task, not in `test`, not in any workflow, and no threshold**
  (`failOnSurvived: false`, no `thresholds.break`). Equivalent mutants
  (rewrites that change no observable behaviour) always remain, so 100% is
  not a goal; read the score like cyclomatic complexity, as a pointer to where
  tests would pay off. Agent pipelines run `pnpm test` as their quality gate;
  wired in there, every nightly job would run this and read each survivor as
  a failure.

Commands and reports:

- Everything: `pnpm mutation` (from the root). Only what changed:
  `pnpm --filter @blindfold-chess/features mutation --since main` (flags go
  straight to mutator).
- Reports: `packages/features/.mutator/report/index.html` and `mutation.json`
  (`.mutator/` is regenerated, so it is gitignored). A `--since` run
  overwrites `mutation.json` with the diff-only result; re-run the full suite
  when you need the overall numbers.

Reading survivors:

- A survivor is one of: a missing test, unnecessary code, or an equivalent
  mutant. Add a test, or consider deleting the code.
- Only a mutant judged equivalent is accepted: run
  `pnpm exec mutator accept <key> --reason <text>` with `packages/features` as
  the working directory (mutator treats the cwd as the project root) and
  commit the resulting `mutator.accepted.json` — it is the decision history.
  When in doubt, do not accept.
- A new test asserts behaviour a caller can observe, and its name describes
  that behaviour, not the mutant it kills ("fails when `>=` becomes `>`").
- mutator ships agent skills (`pnpm exec mutator init-skill` writes them to
  `.claude/skills/`). They are not installed here; `.claude/skills/` is
  tracked, so read their contents before committing them.

Method: https://zenn.dev/mizchi/articles/mutation-test-quality
