import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export const nextJsConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  js.configs.recommended,
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
    ignores: ["dist/**"],
  },
];
