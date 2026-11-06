import { banPlugins } from "./ban-plugin.js";

/**
 * Lint-ban on importing `revalidatePath` from `next/cache` in apps/web.
 *
 * Almost every route in that app is dynamic, so revalidatePath usually has no
 * cache to purge — but inside a Server Action it still re-renders the current
 * page into the action response and wipes the client Router Cache. See
 * "revalidatePath Is Lint-Banned by Default" in apps/web/CLAUDE.md.
 *
 * The rule is `ban/revalidate-path` (see `ban-plugin.js` for why each ban has
 * its own rule name); a deliberate use is lifted with
 * `eslint-disable-next-line ban/revalidate-path -- <reason>`.
 *
 * Defined once here because the rule must be active in BOTH configs that lint
 * apps/web files: `apps/web/eslint.config.mjs` (editor / `pnpm lint`, cwd
 * apps/web) and the repo-root `eslint.config.mjs` (lint-staged pre-commit,
 * cwd root — ESLint 9 resolves the config from the cwd). If the root config
 * lacked the rule, `eslint --fix` on commit would strip the reason-annotated
 * `eslint-disable` comments as unused directives.
 *
 * @param {string} prefix - file-glob prefix to scope the entries when linting
 *   from a cwd above apps/web (pass `'apps/web/'` in the root config).
 */
export function revalidatePathBan(prefix = "") {
  return [
    {
      files: [`${prefix}src/**/*.{ts,tsx}`],
      plugins: banPlugins,
      rules: {
        "ban/revalidate-path": [
          "error",
          {
            paths: [
              {
                name: "next/cache",
                importNames: ["revalidatePath"],
                message:
                  "revalidatePath purges nothing on this app's dynamic routes, and on its SSG/ISR routes under /[locale] the cache tags already reach the Full Route Cache entry, but it still re-renders the current page into the Server Action response. Before using it, check: (1) is the target page actually cached (SSG/ISR)? (2) does the calling component already router.refresh()/push() or own the state? See 'revalidatePath Is Lint-Banned by Default' in apps/web/CLAUDE.md; if genuinely needed, eslint-disable this line with a reason.",
              },
            ],
          },
        ],
      },
    },
    {
      // Tests import the mocked revalidatePath to assert it is (not) called.
      // This turns off only this ban: the chess.js ban stays on in tests.
      files: [
        `${prefix}src/**/*.test.{ts,tsx}`,
        `${prefix}src/**/__tests__/**`,
      ],
      plugins: banPlugins,
      rules: {
        "ban/revalidate-path": "off",
      },
    },
  ];
}
