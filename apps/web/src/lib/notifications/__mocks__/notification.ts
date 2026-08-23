import { vi } from 'vitest';

/**
 * The notification emitters, stubbed as spies.
 *
 * Opt in with a bare `vi.mock('@/lib/notifications/notification')`.
 *
 * These are fire-and-forget side effects at the end of a mutation: they open
 * their own DB work and swallow their failures, so a test about the mutation
 * has to replace them, and fourteen files did it with a hand-written factory
 * listing one or two of the seven exports.
 *
 * All seven are listed because a whole-module mock replaces the module: a
 * factory naming only `createNotification` leaves a subject that later starts
 * calling `notifyFollowersOfNewPost` with `undefined is not a function`, which
 * reads as a bug in the subject rather than a gap in the mock. This is the same
 * trade-off already accepted for `__mocks__/rate-limit.ts`.
 *
 * Read calls back with `vi.mocked(createNotification)`.
 */
export const createNotification = vi.fn();
export const notifyFollowersOfNewPost = vi.fn();
export const notifyFollowersOfNewPosition = vi.fn();
export const notifyPositionForked = vi.fn();
export const notifyFollowersOfNewChunk = vi.fn();
export const notifyFollowersOfNewGame = vi.fn();
export const notifyTopicAuthorOfNewComment = vi.fn();
