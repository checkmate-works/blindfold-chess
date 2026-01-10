import { config as baseConfig } from "@blindfold-chess/eslint-config/base";
import { nextJsConfig } from "@blindfold-chess/eslint-config/next";
import { reactConfig } from "@blindfold-chess/eslint-config/react";

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
    {
        ignores: ["apps/web/.next/**", "**/dist/**", "**/node_modules/**"],
    },
];
