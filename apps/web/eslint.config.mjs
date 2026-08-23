import { nextJsConfig } from '@blindfold-chess/eslint-config/next';
import { revalidatePathBan } from '@blindfold-chess/eslint-config/revalidate-path-ban';
import globals from 'globals';

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      // Written by `supabase start`: bundled, minified copies of the edge
      // runtime's entrypoint. Gitignored (see supabase/.gitignore) but ESLint
      // walks the working tree, not the index, so without this every developer
      // who has started the local stack lints ~220 errors out of one generated
      // line and `pnpm lint` fails for reasons unrelated to their change.
      'supabase/.temp/**',
      'public/stockfish.js',
      'public/stockfish.wasm',
    ],
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
