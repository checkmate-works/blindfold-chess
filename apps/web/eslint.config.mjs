import { nextJsConfig } from '@blindfold-chess/eslint-config/next';
import { revalidatePathBan } from '@blindfold-chess/eslint-config/revalidate-path-ban';
import globals from 'globals';

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'public/stockfish.js', 'public/stockfish.wasm'],
  },
  {
    files: ['*.config.{js,ts,mjs}', 'postcss.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...revalidatePathBan(),
];
