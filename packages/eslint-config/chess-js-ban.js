import { banPlugins } from "./ban-plugin.js";

/**
 * Lint-ban on importing `chess.js` anywhere but `packages/features/src/chess-core/`.
 *
 * The library is wrapped once, behind the typed API that
 * `@blindfold-chess/features/chess-core` exports, so that an upgrade or a
 * replacement of chess.js touches one module. An app or another feature
 * module that imports `chess.js` directly re-creates the coupling the wrapper
 * exists to remove, and it also pulls a second copy of the parser into
 * bundles that already ship the wrapper.
 *
 * The rule is `ban/chess-js` (see `ban-plugin.js` for why each ban has its own
 * rule name). Defined once here because the rule must be active in every
 * config that lints the three consumers: `apps/web/eslint.config.mjs`,
 * `apps/mobile/eslint.config.mjs`, `packages/features/eslint.config.mjs`
 * (editor / `pnpm lint`, cwd = the package) and the repo-root
 * `eslint.config.mjs` (lint-staged pre-commit, cwd = root — ESLint 9 resolves
 * the config from the cwd).
 *
 * Test files are covered too, in every consumer including apps/web, whose
 * `revalidatePath` ban exempts tests. A test that imports chess.js couples to
 * the library exactly as production code does — an upgrade then breaks the
 * suite that is supposed to vouch for the upgrade — and the wrapper already
 * exposes everything a test needs to build or inspect a position. The one
 * exempt directory is chess-core itself, whose own tests may exercise the
 * library they wrap.
 *
 * @param {string} prefix - file-glob prefix to scope the entries when linting
 *   from a cwd above the package (pass `'apps/web/'`, `'apps/mobile/'` or
 *   `'packages/features/'` in the root config).
 */
export function chessJsBan(prefix = "") {
  return [
    {
      files: [`${prefix}src/**/*.{ts,tsx}`],
      ignores: [`${prefix}src/chess-core/**`],
      plugins: banPlugins,
      rules: {
        "ban/chess-js": [
          "error",
          {
            paths: [
              {
                name: "chess.js",
                message:
                  "chess.js is imported only inside packages/features/src/chess-core/. Use the typed wrapper from '@blindfold-chess/features/chess-core' (or a deep path under it) instead, so that upgrading or replacing the library stays confined to that one module.",
              },
            ],
          },
        ],
      },
    },
  ];
}
