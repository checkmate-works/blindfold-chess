/**
 * Identity translator: every lookup returns its own key.
 *
 * Opt in with a bare `vi.mock('@/i18n/use-safe-translations')` — vitest picks
 * this file up automatically. 35 test files had spelled the same three-line
 * factory out instead, and it cannot be shared as a plain helper because
 * `vi.mock` factories are hoisted above imports.
 *
 * Tests that need real copy — asserting on interpolated values, or on
 * `t.has()` deciding which keys exist — pass their own factory instead. This
 * is deliberately NOT installed globally in `vitest.setup.ts`: a test that
 * renders real translations should keep doing so unless it says otherwise.
 */
export const useSafeTranslations = () => (key: string) => key;
