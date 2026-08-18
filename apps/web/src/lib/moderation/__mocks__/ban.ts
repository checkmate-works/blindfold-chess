import { vi } from 'vitest';

/**
 * Ban check, defaulting to "not banned".
 *
 * Opt in with a bare `vi.mock('@/lib/moderation/ban')`; drive it with
 * `vi.mocked(isUserBanned).mockResolvedValue(true)` from the real path.
 * Every guarded Server Action checks this, so 28 tests carried the same
 * one-key factory — which cannot be a plain helper, since `vi.mock`
 * factories are hoisted above imports.
 *
 * `ban.ts` exports this function and nothing else, so replacing the module
 * wholesale cannot hide a second export from the test.
 */
export const isUserBanned = vi.fn(async () => false);
