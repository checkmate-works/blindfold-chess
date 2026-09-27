import { vi } from 'vitest';

import type * as Actual from '../user-grants';

/**
 * Grant check, defaulting to "no active grant".
 *
 * Opt in with a bare `vi.mock('@/lib/users/user-grants')`; drive it with
 * `vi.mocked(hasActiveGrant).mockResolvedValue(true)` from the real path.
 * One of the three ad-free entitlement sources — see
 * `@/lib/billing/__mocks__/subscription` for why these are shared.
 *
 * Only `hasActiveGrant` is provided: a suite whose subject also reaches the
 * grant-period helpers keeps its own factory, and vitest names the missing
 * export if one reaches them through this mock by mistake. The real module is
 * not loaded here on purpose — it imports `@/lib/db`, and pulling that in from
 * a hoisted mock races the suite's own `@/lib/db` factory.
 */
export const hasActiveGrant = vi.fn<typeof Actual.hasActiveGrant>(async () => false);
