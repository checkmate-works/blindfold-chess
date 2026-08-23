import { vi } from 'vitest';

/**
 * `next-navigation-guard`, stubbed as permanently inactive.
 *
 * Opt in with a bare `vi.mock('next-navigation-guard')`.
 *
 * The guard exists to intercept a navigation away from a dirty form and show
 * the unsaved-changes dialog. Almost every form test is about something else
 * entirely — validation, submission, error banners — and only mocks the hook
 * because the component calls it. `active: false` is the "nothing is being
 * blocked" state those tests want, and it was written out by hand in fourteen
 * files, seven of them byte-identical.
 *
 * `accept` / `reject` are `vi.fn()` rather than no-op arrows so a test that
 * does care can assert on them without replacing the module.
 *
 * Tests that drive the guard itself keep their own factory: what matters there
 * is the `enabled` flag the component passes in, which is per-test and belongs
 * in the test that asserts on it.
 */
export const useNavigationGuard = vi.fn(() => ({
  active: false,
  accept: vi.fn(),
  reject: vi.fn(),
}));
