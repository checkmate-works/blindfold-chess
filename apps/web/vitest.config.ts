import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

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
