import { vi } from 'vitest';

/**
 * No-op activity logger.
 *
 * Opt in with a bare `vi.mock('@/lib/users/activity-log')`. Almost every
 * Server Action logs an event, so almost every action test had to stub this —
 * 29 of them with the same one-key factory, which cannot be shared as a plain
 * helper because `vi.mock` factories are hoisted above imports.
 *
 * Still a `vi.fn()`, so a test that cares can `import { logActivityEvent }`
 * from the real path and assert on the calls; vitest hands back this mock.
 * A handful of tests route it through their own hoisted spy instead and keep
 * their inline factory.
 */
export const logActivityEvent = vi.fn();
