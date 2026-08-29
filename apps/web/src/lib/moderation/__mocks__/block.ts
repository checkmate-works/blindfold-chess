import { vi } from 'vitest';

/**
 * Block checks, all defaulting to "not blocked" — the state almost every
 * action test wants, and the same factory fifteen of them wrote out.
 *
 * Opt in with a bare `vi.mock('@/lib/moderation/block')`. Unlike `ban.ts`,
 * this module has several exports, so a test asserting on one of them should
 * say which: `vi.mocked(assertNotBlocked).mockResolvedValue({ error:
 * MODERATION_BLOCKED_ERROR })`.
 *
 * `assertNotBlocked` is mocked independently rather than layered over the
 * mocked `isBlockedBetween`: replacing the module wholesale means the real
 * composition is gone, so driving the low-level predicate would leave the
 * guard the write paths actually call still answering "allowed".
 */
export const isBlockedBetween = vi.fn(async () => false);
export const hasBlocked = vi.fn(async () => false);
export const MODERATION_BLOCKED_ERROR = 'moderation.blocked';
export const assertNotBlocked = vi.fn<
  () => Promise<{ error: typeof MODERATION_BLOCKED_ERROR } | null>
>(async () => null);
