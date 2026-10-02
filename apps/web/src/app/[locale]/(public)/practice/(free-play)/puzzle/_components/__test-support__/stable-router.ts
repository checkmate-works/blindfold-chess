import { vi } from 'vitest';

/**
 * Router spies for the puzzle authoring screens, and the one router object
 * every render of them receives.
 *
 * The object has to be stable: these components' hydration effects list
 * `router` in their deps, so a fresh object per render would reshoot the
 * effect after every setState and loop forever. Six suites had declared the
 * same `vi.hoisted` block to get that; the module keeps it in one place.
 *
 * `__mocks__/routing.ts` deliberately leaves `useRouter` to each test, so a
 * suite opts in by returning {@link stableRouter} from its own factory. The
 * import has to happen inside the factory — `vi.mock` is hoisted above the
 * file's static imports, so a binding imported at the top is not yet live
 * when the factory runs:
 *
 * ```ts
 * import { mockPush, mockReplace } from './__test-support__/stable-router';
 * vi.mock('@/i18n/routing', async () => {
 *   const { stableRouter } = await import('./__test-support__/stable-router');
 *   return { useRouter: () => stableRouter };
 * });
 * ```
 *
 * Spies are shared across the suite, so reset them in `beforeEach`.
 */
export const mockPush = vi.fn();
export const mockReplace = vi.fn();
export const stableRouter = { push: mockPush, replace: mockReplace };
