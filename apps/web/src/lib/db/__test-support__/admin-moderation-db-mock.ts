import type { Mock } from 'vitest';

import { whereThenLimit } from './query-chain';

/** The spies an admin moderation action test wires into the `@/lib/db` double. */
export type AdminModerationDbSpies = {
  /** Queued rows for every `select().from().where().limit()`. */
  selectFromWhere: Mock;
  /**
   * The `where` at the end of `update().set()`. Pass the spy itself when the
   * action only awaits the update, or `whereThenReturning(spy)` when it reads
   * the updated rows back.
   */
  updateWhere: (...args: unknown[]) => unknown;
  /** Records the values handed to `insert(...).values(...)` — the audit row. */
  insertValues: Mock;
  /** Called once per `db.transaction(...)`, before its callback runs. */
  transaction: Mock;
};

/**
 * The `@/lib/db` stand-in for an admin action that checks the caller's role,
 * mutates one target row and writes a `moderation_actions` audit row in the
 * same transaction (ban, unban, soft-deleting a chunk or position).
 *
 * Those actions walk the same chain — role/target lookups through
 * `.where().limit()`, one `update().set().where()`, one `insert().values()`,
 * all optionally inside `db.transaction` — and each of their tests had
 * transcribed the double for it along with the `moderationActions` and
 * `userRoles` column maps. The call site spreads this and adds the target
 * table it mutates.
 *
 * The spies arrive behind a thunk for the same reason as in
 * `topicReplyDbMock`: `vi.mock` factories run while the test module's own
 * `const mockX = vi.fn()` bindings are still in their temporal dead zone.
 */
export function adminModerationDbMock(spies: () => AdminModerationDbSpies) {
  const makeDbOps = () => ({
    select: () => ({
      from: () => ({
        where: whereThenLimit(spies().selectFromWhere),
      }),
    }),
    update: () => ({
      set: () => ({
        where: (...args: unknown[]) => spies().updateWhere(...args),
      }),
    }),
    insert: () => ({
      values: (...args: unknown[]) => spies().insertValues(...args),
    }),
  });

  return {
    db: {
      ...makeDbOps(),
      transaction: async (fn: (tx: ReturnType<typeof makeDbOps>) => Promise<void>) => {
        spies().transaction();
        return fn(makeDbOps());
      },
    },
    moderationActions: {
      actorId: 'actor_id',
      action: 'action',
      targetType: 'target_type',
      targetId: 'target_id',
      reason: 'reason',
      metadata: 'metadata',
      ipAddress: 'ip_address',
    },
    userRoles: { userId: 'user_id' },
  };
}
