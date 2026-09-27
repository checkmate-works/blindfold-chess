import { vi } from 'vitest';

import type * as Actual from '../dan-rank';

/**
 * Dan-tier check, defaulting to "below dan".
 *
 * Opt in with a bare `vi.mock('@/lib/users/dan-rank')`; drive it with
 * `vi.mocked(hasDanTierRank).mockResolvedValue(true)` from the real path.
 * One of the three ad-free entitlement sources — see
 * `@/lib/billing/__mocks__/subscription` for why these are shared.
 *
 * `dan-rank.ts` exports this function and nothing else, so replacing the
 * module wholesale cannot hide a second export from the test.
 */
export const hasDanTierRank = vi.fn<typeof Actual.hasDanTierRank>(async () => false);
