import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
// import onlyWant from "eslint-plugin-only-warn";

/**
 * A shared ESLint configuration for the repository.
 *
 * ## Why this package pins `typescript` to a 6.x alias
 *
 * Every other workspace runs plain TypeScript 7. typescript-eslint refuses to
 * load under it — its peer range is still `>=4.8.4 <6.1.0` and the package
 * throws `typescript-eslint does not support TS 7.0.` at require time, so a
 * shared TS7 install would take `pnpm lint` down entirely.
 *
 * The fix is `"typescript": "npm:@typescript/typescript6@^6.0.2"` in this
 * package's devDependencies. pnpm's peer resolution then hands TS6 to
 * `@typescript-eslint/*`, `typescript-eslint` and `ts-api-utils` — and to
 * nothing else. Keep the alias here: applying it in an app makes `next build`
 * fail, because Next resolves `typescript/bin/tsc` and the TS6 alias ships
 * `bin/tsc6` instead (side-by-side installs are why Microsoft renamed it).
 *
 * Linting is unaffected by the older parser because no config in this repo
 * turns on type-aware rules (`parserOptions.project`, `projectService`, or a
 * `*-type-checked` preset) — typescript-eslint is used purely as a parser.
 * Re-check that assumption before adding a type-aware rule.
 *
 * Remove the alias once typescript-eslint accepts TS7 as a peer.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
      // Enforce `import type` for type-only imports. This is critical in
      // Next.js `"use server"` files, where mixed `import { type X, y }`
      // statements can leave value references for types after the Server
      // Actions transform, causing runtime `ReferenceError`s.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
          disallowTypeAnnotations: false,
        },
      ],
      // Functions must not mutate their inputs (`props: true` also bans
      // assigning to a parameter's properties — the shape that has actually
      // slipped through review: `moves.sort(...)` on a passed array, grafting
      // nodes into a caller's tree). Deliberate in-place APIs (e.g. the
      // Sentry `beforeSend` scrubber) opt out per line with a reason.
      // Accumulator-style params conventionally named `acc`/`draft` and
      // React refs (`ref.current` writes) stay allowed.
      "no-param-reassign": [
        "error",
        {
          props: true,
          ignorePropertyModificationsFor: ["acc", "draft"],
          ignorePropertyModificationsForRegex: ["Refs?$", "^ref$"],
        },
      ],
    },
  },
  {
    ignores: ["dist/**"],
  },
];
