import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'node_modules/**',
      'public/stockfish.js',
      'public/stockfish.wasm',
      'public/stockfish.wasm.js',
    ],
  },
  {
    rules: {
      // Warn about console statements to prevent them from reaching production
      // Allow console.error and console.warn for proper error logging
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Relax set-state-in-effect rule - many legitimate use cases for debouncing, etc.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default eslintConfig;
