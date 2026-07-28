import { config as baseConfig } from "@blindfold-chess/eslint-config/base";
import { nextJsConfig } from "@blindfold-chess/eslint-config/next";
import { reactConfig } from "@blindfold-chess/eslint-config/react";
import { revalidatePathBan } from "@blindfold-chess/eslint-config/revalidate-path-ban";

/** @type {import("eslint").Linter.Config} */
export default [
    ...baseConfig,
    ...nextJsConfig.map((config) => ({
        ...config,
        files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
    })),
    ...reactConfig.map((config) => ({
        ...config,
        files: ["apps/mobile/**/*.{js,jsx,ts,tsx}"],
    })),
    // Must also live in this root config: lint-staged runs eslint from the
    // repo root, and ESLint 9 resolves the config from the cwd — without the
    // rule here, `eslint --fix` on commit strips the reason-annotated
    // eslint-disable comments in apps/web as unused directives.
    ...revalidatePathBan("apps/web/"),
    {
        ignores: ["apps/web/.next/**", "**/dist/**", "**/node_modules/**"],
    },
];
