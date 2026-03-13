import { reactConfig } from "@blindfold-chess/eslint-config/react";

/** @type {import("eslint").Linter.Config} */
export default [
  ...reactConfig,
  {
    files: ["index.js", "polyfill.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        global: "readonly",
      },
    },
  },
];
