import { vi } from 'vitest';

import type * as Actual from '../subscription';

/**
 * Subscription lookups, defaulting to "no subscription".
 *
 * Opt in with a bare `vi.mock('@/lib/billing/subscription')`; drive it with
 * `vi.mocked(hasActiveSubscription).mockResolvedValue(true)` from the real
 * path. The ad-free entitlement is decided from three sources — this one,
 * `@/lib/users/user-grants` and `@/lib/users/dan-rank` — and every suite
 * that exercises it had written the same three factories out by hand.
 *
 * Both of the module's exports are replaced, so the wholesale mock cannot
 * hide a real function behind the test.
 */
export const hasActiveSubscription = vi.fn<typeof Actual.hasActiveSubscription>(async () => false);
export const getUserSubscription = vi.fn<typeof Actual.getUserSubscription>(async () => null);
