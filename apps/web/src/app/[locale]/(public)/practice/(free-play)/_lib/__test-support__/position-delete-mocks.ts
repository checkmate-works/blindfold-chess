import { vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

/**
 * The module doubles behind `deletePosition` and `deletePuzzle`.
 *
 * The two actions run the same soft-delete through the shared position
 * mutation lib, so their suites had the same sixty lines of `vi.mock`
 * factories, differing only in the type they expect the row to carry. A
 * `vi.mock` factory cannot be shared as a plain helper — it is hoisted above
 * imports — but it may *call* one, because the factory body runs lazily. So
 * each suite still declares its mocks, as
 *
 * ```ts
 * vi.mock('@/lib/auth', () => positionDeleteMocks.auth());
 * vi.mock('@/lib/db', () => positionDeleteMocks.db());
 * ```
 *
 * and drives them through the spies exported here.
 */
export const mockAuthenticateAndGuard = vi.fn();
/** Resolves the `select … limit(1)` that looks the entry up. */
export const mockSelectLimit = vi.fn();
/** Receives the `update … where` that stamps `deletedAt`, inside and outside a transaction. */
export const mockUpdateWhere = vi.fn();

export const positionDeleteMocks = {
  auth: () => ({
    authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
  }),

  db: async () => {
    const updateChain = {
      set: () => ({
        where: (...args: unknown[]) => mockUpdateWhere(...args),
      }),
    };
    return {
      ...(await actualDbSchema()),
      db: {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => mockSelectLimit(),
            }),
          }),
        }),
        update: () => updateChain,
        transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({ update: () => updateChain }),
      },
      positions: {
        id: 'id',
        userId: 'user_id',
        type: 'type',
        deletedAt: 'deleted_at',
      },
    };
  },

  points: () => ({
    clawbackPointsForPost: vi.fn().mockResolvedValue(undefined),
  }),

  /**
   * Cuts the request-layer cookie chain (next/headers, billing, grants) that
   * the shared position-mutation lib pulls in via its dan-promotion cookie
   * refresh; the helper itself is unit-tested in
   * `@/lib/ads/ads-hidden-cookie-writer.test.ts`.
   */
  adsHiddenCookieWriter: () => ({
    refreshAdsHiddenCookieOnDanPromotion: vi.fn(),
  }),
};
