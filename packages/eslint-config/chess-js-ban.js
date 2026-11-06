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
 * Defined once here because the rule must be active in every config that
 * lints the three consumers: `apps/web/eslint.config.mjs`,
 * `apps/mobile/eslint.config.mjs`, `packages/features/eslint.config.mjs`
 * (editor / `pnpm lint`, cwd = the package) and the repo-root
 * `eslint.config.mjs` (lint-staged pre-commit, cwd = root — ESLint 9
 * resolves the config from the cwd).
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
      rules: {
        "no-restricted-imports": [
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
