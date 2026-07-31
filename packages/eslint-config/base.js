import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
// import onlyWant from "eslint-plugin-only-warn";

/**
 * A shared ESLint configuration for the repository.
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
