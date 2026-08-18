import { vi } from 'vitest';

/**
 * Block checks, both defaulting to "not blocked" — the state almost every
 * action test wants, and the same two-key factory fifteen of them wrote out.
 *
 * Opt in with a bare `vi.mock('@/lib/moderation/block')`. Unlike `ban.ts`,
 * this module has two exports, so a test asserting on one of them should say
 * which: `vi.mocked(isBlockedBetween).mockResolvedValue(true)`.
 */
export const isBlockedBetween = vi.fn(async () => false);
export const hasBlocked = vi.fn(async () => false);
