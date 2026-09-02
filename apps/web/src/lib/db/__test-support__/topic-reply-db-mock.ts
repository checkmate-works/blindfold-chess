import type { Mock } from 'vitest';

import { whereThenRows } from './query-chain';

/** The spies a create-reply test wires into the `@/lib/db` double. */
export type TopicReplyDbSpies = {
  /** Queried rows for every select except the auth guard's own-profile lookup. */
  selectFromWhere: Mock;
  /** Rows for that own-profile lookup, kept separate so it consumes no queued rows. */
  selectProfile: Mock;
  /** Records the values handed to `insert(...).values(...)`, inside a transaction or not. */
  insertValues: Mock;
  /** The row `.returning()` yields for the inserted reply. */
  insertReturning: Mock;
};

/**
 * The `@/lib/db` stand-in a create-reply action test needs: the query chain the
 * reply path walks, plus the three table objects it references by identity.
 *
 * Every test of a create-reply action needs the same double, because they all
 * exercise the same base — and each of them had transcribed it, down to the
 * comment explaining why `profiles` is routed to its own spy. Only the fixture
 * data and the assertions differ between those tests, so only those stay in
 * them.
 *
 * The spies arrive behind a thunk rather than as a plain object: `vi.mock`
 * factories run while the test module's own top-level `const mockX = vi.fn()`
 * bindings are still in their temporal dead zone, so the call site can hand
 * over a closure but not the spies themselves.
 */
export function topicReplyDbMock(spies: () => TopicReplyDbSpies) {
  const profilesTable = { id: 'id' };

  const insert = () => ({
    values: (...args: unknown[]) => {
      spies().insertValues(...args);
      return {
        returning: () => spies().insertReturning(),
      };
    },
  });

  return {
    db: {
      select: () => ({
        from: (table: unknown) => {
          // The auth guard's own-profile lookup selects from `profiles` with
          // `.where(...).limit(1)`; route it to its own spy so it never
          // consumes the queued results of the reply-path selects.
          if (table === profilesTable) {
            return {
              where: () => ({
                limit: () => spies().selectProfile(),
              }),
            };
          }
          return {
            where: whereThenRows(spies().selectFromWhere),
          };
        },
      }),
      insert,
      transaction: async (cb: (tx: { insert: typeof insert }) => Promise<unknown>) =>
        cb({ insert }),
    },
    topicPosts: {
      id: 'id',
      userId: 'user_id',
      topicType: 'topic_type',
      topicKey: 'topic_key',
      parentId: 'parent_id',
      rootPostId: 'root_post_id',
      content: 'content',
      deletedAt: 'deleted_at',
      replyPermission: 'reply_permission',
    },
    userFollows: {
      id: 'id',
      followerId: 'follower_id',
      followingId: 'following_id',
    },
    profiles: profilesTable,
  };
}
