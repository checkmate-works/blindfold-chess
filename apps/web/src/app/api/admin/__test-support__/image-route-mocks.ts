import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

/** The signed-in admin every image-route suite runs as. */
export const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';

/** The spies an admin image-route test wires into the `@/lib/db` double. */
export type AdminImageRouteDbSpies = {
  /** Rows for the admin check's `user_roles` lookup. */
  userRoleRows: Mock<() => unknown[]>;
  /** Rows for the route's own record lookup (the creative, the article). */
  resourceRows: Mock<() => unknown[]>;
};

/**
 * The `@/lib/db` stand-in the admin image routes are tested against: every
 * select ends in `.limit()`, and the one from `user_roles` is routed to its
 * own spy so the admin check never consumes the rows queued for the record
 * lookup.
 *
 * The ad-creative and article-image suites had each written this double,
 * the Sharp stub below and the caller wrapper out in full, differing only in
 * the name of the record spy. The spies arrive behind a thunk because
 * `vi.mock` factories run while the test module's own top-level `const
 * mockX = vi.fn()` bindings are still in their temporal dead zone.
 */
export async function adminImageRouteDbMock(spies: () => AdminImageRouteDbSpies) {
  const schema = await actualDbSchema();
  return {
    ...schema,
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: () => ({
            limit: () =>
              table === schema.userRoles ? spies().userRoleRows() : spies().resourceRows(),
          }),
        }),
      }),
    },
  };
}

/**
 * A `sharp` that is never reached — the prelude tests reject the request or
 * stop at the record lookup — but which the route's upload helper imports at
 * module load.
 */
export function sharpMock() {
  return {
    default: vi.fn(() => ({
      rotate: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      toBuffer: vi.fn(),
    })),
  };
}

export type ImageRouteHandler = (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => Promise<Response | undefined>;

/**
 * Call a handler with the suite's route params and insist on a response.
 *
 * The handlers' inferred return type admits `undefined`, because the shared
 * upload parser's error slot is optional and one branch returns it directly.
 * No path actually produces it, so fail loudly here rather than spread
 * non-null assertions across every assertion in the suite.
 */
export function imageRouteCaller(params: Promise<{ id: string }>) {
  return async (handler: ImageRouteHandler, request: Request): Promise<Response> => {
    const response = await handler(request, { params });
    if (!response) throw new Error('handler returned no response');
    return response;
  };
}
