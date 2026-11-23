import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

// Tests must not see the environment of the shell that launched them. A shell
// prepared for `next dev` exports `NODE_ENV=development` and the local
// `NEXT_PUBLIC_*` values (site URL `http://chess.localhost:3100`, the local Supabase
// URL), and modules such as `src/config.ts` read those at import time — so the
// suite asserted production URLs against localhost and failed in 11 files
// while passing in a clean shell or CI. Vitest only defaults `NODE_ENV` to
// `test` when it is unset, so it has to be forced here.
//
// This runs while the config is loaded, before any worker is spawned, so every
// worker inherits the cleaned environment. A test that needs one of these
// variables sets it itself (`vi.stubEnv`), which keeps the dependency visible
// in the test.
for (const key of Object.keys(process.env)) {
  if (key.startsWith('NEXT_PUBLIC_')) delete process.env[key];
}
// Assigned through a cast: Next's type augmentation declares NODE_ENV readonly.
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    globals: true,
    /**
     * `mockClear()` on every mock before each test — what 170 files opened
     * their `beforeEach` with by hand. Implementations survive, so a
     * `vi.mock` factory or a `mockResolvedValue` set at module scope still
     * applies; only call history is reset. A test that needs the
     * implementation gone too still calls `vi.resetAllMocks()` itself.
     */
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
