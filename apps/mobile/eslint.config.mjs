import { reactConfig } from "@blindfold-chess/eslint-config/react";
import { chessJsBan } from "@blindfold-chess/eslint-config/chess-js-ban";

/** @type {import("eslint").Linter.Config} */
export default [
  ...reactConfig,
  ...chessJsBan(),
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
