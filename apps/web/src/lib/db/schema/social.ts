// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — social.
//
// User-to-user social graph: follows and blocks.
import { sql } from 'drizzle-orm';
import { check, index, pgTable, unique, uuid } from 'drizzle-orm/pg-core';

import { createdAtOnly } from './columns';

// User Follows
export const userFollows = pgTable(
  'user_follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: uuid('follower_id').notNull(), // references auth.users — FK defined in custom SQL
    followingId: uuid('following_id').notNull(), // references auth.users — FK defined in custom SQL
    ...createdAtOnly,
  },
  (table) => [
    unique('uq_user_follow').on(table.followerId, table.followingId),
    check('chk_no_self_follow', sql`${table.followerId} != ${table.followingId}`),
    index('idx_user_follows_follower').on(table.followerId),
    index('idx_user_follows_following').on(table.followingId),
  ]
);

export type UserFollow = typeof userFollows.$inferSelect;
export type NewUserFollow = typeof userFollows.$inferInsert;

// User Blocks
export const userBlocks = pgTable(
  'user_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id').notNull(), // references auth.users — FK defined in custom SQL
    blockedId: uuid('blocked_id').notNull(), // references auth.users — FK defined in custom SQL
    ...createdAtOnly,
  },
  (table) => [
    unique('uq_user_block').on(table.blockerId, table.blockedId),
    check('chk_no_self_block', sql`${table.blockerId} != ${table.blockedId}`),
    index('idx_user_blocks_blocker').on(table.blockerId),
    index('idx_user_blocks_blocked').on(table.blockedId),
  ]
);

export type UserBlock = typeof userBlocks.$inferSelect;
export type NewUserBlock = typeof userBlocks.$inferInsert;

/**
 * Moderation Actions — immutable audit log for admin moderation operations.
 *
 * @design Event log with materialized state (not pure Event Sourcing)
 *
 * The moderation system uses a dual-source pattern (Discourse, GitLab, Mastodon, Lichess):
 * - `profiles.bannedAt` provides O(1) status checks — every Server Action calls
 *   `isUserBanned()`, so deriving state by replaying events would be prohibitively expensive.
 * - `moderation_actions` stores the full audit trail with context (who, what, why, when).
 * Corrections are recorded as new events (e.g., `unban` after `ban`), never as row updates.
 *
 * @design Polymorphic target_type + target_id (GitLab/Mastodon pattern)
 *
 * Consistent with `topicPosts.topicType + topicKey`. A single table handles all moderation
 * targets (users, posts, etc.) without schema changes when new target types are added.
 * - `targetType`: the category of the target (e.g., 'user', 'topic_post')
 * - `targetId`: the UUID of the target entity
 *
 * @design action is varchar, not pgEnum
 *
 * New action types ('ban', 'unban', 'delete_post', 'warn', etc.) will be added
 * incrementally. Using varchar avoids requiring an ALTER TYPE migration for each new action.
 *
 * @design metadata (JSONB) for flexible context
 *
 * Stores action-specific data (deleted content, previous values, etc.). Replaces
 * dedicated `previous_value`/`new_value` columns, providing extensibility without
 * schema changes.
 *
 * @design No updated_at — audit logs are immutable
 *
 * Records are append-only. Corrections or reversals are expressed as new events.
 * No UPDATE or DELETE RLS policies are defined.
 *
 * @design ip_address for forensic analysis (Discourse/GitLab pattern)
 *
 * Captures the admin's IP at action time for security auditing. varchar(45) supports
 * the longest possible IPv6 representation.
 *
 * @design FKs managed in custom SQL
 *
 * `actorId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`. This is because `auth.users` lives in a
 * separate Supabase-managed schema that Drizzle does not control.
 */
