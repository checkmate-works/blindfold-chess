import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Articles
export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    locale: varchar('locale', { length: 10 }).notNull(), // BCP 47
    status: varchar('status', { length: 20 }).default('draft'),
    pinnedAt: timestamp('pinned_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [unique('uq_articles_slug_locale').on(table.slug, table.locale)]
);

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

// Announcements
export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    locale: varchar('locale', { length: 10 }).notNull(), // BCP 47
    status: varchar('status', { length: 20 }).default('draft'),
    visibility: varchar('visibility', { length: 20 }).default('public'),
    pinnedAt: timestamp('pinned_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [unique('uq_announcements_slug_locale').on(table.slug, table.locale)]
);

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;

// Glossary tables
export const glossaryTerms = pgTable('glossary_terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  termEn: varchar('term_en', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const glossaryTermTranslations = pgTable(
  'glossary_term_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    termId: uuid('term_id')
      .notNull()
      .references(() => glossaryTerms.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 10 }).notNull(), // BCP 47
    term: varchar('term', { length: 255 }).notNull(),
    definition: text('definition').notNull(),
    reading: varchar('reading', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [unique('uq_term_locale').on(table.termId, table.locale)]
);

export const glossaryTermAliases = pgTable('glossary_term_aliases', {
  id: uuid('id').primaryKey().defaultRandom(),
  termId: uuid('term_id')
    .notNull()
    .references(() => glossaryTerms.id, { onDelete: 'cascade' }),
  alias: varchar('alias', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const glossaryTermPositions = pgTable('glossary_term_positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  termId: uuid('term_id')
    .notNull()
    .references(() => glossaryTerms.id, { onDelete: 'cascade' }),
  fen: varchar('fen', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').default(0),
  caption: varchar('caption', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const glossaryTermRelations = pgTable(
  'glossary_term_relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    termId: uuid('term_id')
      .notNull()
      .references(() => glossaryTerms.id, { onDelete: 'cascade' }),
    relatedTermId: uuid('related_term_id')
      .notNull()
      .references(() => glossaryTerms.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [unique('uq_term_relation').on(table.termId, table.relatedTermId)]
);

// Practice sessions
export const practiceSessions = pgTable(
  'practice_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    menuType: text('menu_type').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
    settings: jsonb('settings').default({}),
    result: jsonb('result').notNull(),
  },
  (table) => [
    index('idx_practice_sessions_user').on(table.userId),
    index('idx_practice_sessions_menu').on(table.userId, table.menuType),
    index('idx_practice_sessions_recent').on(table.userId, table.startedAt),
  ]
);

// Type exports for use in application code
export type GlossaryTerm = typeof glossaryTerms.$inferSelect;
export type NewGlossaryTerm = typeof glossaryTerms.$inferInsert;
export type GlossaryTermTranslation = typeof glossaryTermTranslations.$inferSelect;
export type NewGlossaryTermTranslation = typeof glossaryTermTranslations.$inferInsert;
export type GlossaryTermAlias = typeof glossaryTermAliases.$inferSelect;
export type NewGlossaryTermAlias = typeof glossaryTermAliases.$inferInsert;
export type GlossaryTermPosition = typeof glossaryTermPositions.$inferSelect;
export type NewGlossaryTermPosition = typeof glossaryTermPositions.$inferInsert;
export type GlossaryTermRelation = typeof glossaryTermRelations.$inferSelect;
export type NewGlossaryTermRelation = typeof glossaryTermRelations.$inferInsert;
export type PracticeSession = typeof practiceSessions.$inferSelect;
export type NewPracticeSession = typeof practiceSessions.$inferInsert;

// Profiles
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // references auth.users(id) — FK defined in custom SQL
  username: varchar('username', { length: 255 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 1024 }),
  bio: text('bio'),
  country: varchar('country', { length: 2 }), // ISO 3166-1 alpha-2
  flair: varchar('flair', { length: 50 }),
  fideId: varchar('fide_id', { length: 50 }),
  chesscomUsername: varchar('chesscom_username', { length: 255 }),
  lichessUsername: varchar('lichess_username', { length: 255 }),
  bannedAt: timestamp('banned_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

// App role enum
export const appRoleEnum = pgEnum('app_role', ['admin', 'user']);

// User roles table
export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users
    role: appRoleEnum('role').notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [unique('uq_user_role').on(table.userId, table.role)]
);

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

/**
 * Topic Posts — UGC (User Generated Content) for chess concepts.
 *
 * @description
 * A polymorphic table that stores user opinions/impressions about various chess
 * concepts (squares, diagonals, pawn structures, etc.).
 *
 * @design Polymorphic topicType + topicKey pattern
 *
 * Instead of creating separate tables per topic type (square_opinions,
 * diagonal_opinions, ...), this single table uses a discriminator pair:
 * - `topicType`: the category of the topic (e.g., 'square', 'diagonal', 'pawn-structure')
 * - `topicKey`: the identifier within that category (e.g., 'e4', 'a1h8', 'french')
 *
 * This avoids schema changes when adding new topic types. Validation of topicKey
 * values is handled at the application layer since the format differs per topicType.
 *
 * @design topicKey must always be short and URL-safe
 *
 * topicKey appears in URLs (e.g., /topics/squares/e4), so it must be concise and
 * URL-safe. For fixed/finite topics (squares: a1-h8, diagonals), the natural
 * identifier is used directly. For open-ended topics (pawn structures), a separate
 * master table provides human-readable slugs that serve as topicKey values,
 * keeping complex data (like FEN strings) out of the key/URL.
 *
 * @design topicType is varchar, not pgEnum
 *
 * New topic types (diagonals, pawn structures, etc.) will be added incrementally.
 * Using varchar avoids requiring an ALTER TYPE migration for each new type.
 *
 * @design No locale column — UGC is language-agnostic
 *
 * Unlike editorial content (posts, glossary), user-generated opinions are displayed
 * regardless of language. The [locale] route segment only affects UI chrome (labels,
 * buttons), not content filtering. This follows the pattern of major UGC platforms
 * (X, Reddit, Instagram) and avoids fragmenting a niche community by language.
 *
 * @design No title column
 *
 * Posts are short-to-medium opinions (similar to X posts or Reddit comments), not
 * titled articles. Omitting title: (1) lowers the posting friction, (2) avoids a
 * NULL-heavy column since replies (via parentId self-reference) never need titles,
 * and (3) eliminates the need for two different card layouts in list views.
 * Content preview (truncated first line) is used for list display instead.
 *
 * @design parentId for Reddit-style threaded replies (future scope)
 *
 * Top-level posts have parentId = null. Replies point to their parent's id.
 * The column exists in the initial schema to solidify the table structure, but
 * reply functionality is not implemented in the initial scope.
 *
 * @design FKs managed in custom SQL
 *
 * userId → auth.users and parentId → topic_posts self-reference are defined in
 * Supabase-side SQL (not Drizzle references), following the same pattern as
 * profiles.id. This is because auth.users lives in a separate Supabase-managed
 * schema that Drizzle does not control.
 */
export const topicPosts = pgTable(
  'topic_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    topicType: varchar('topic_type', { length: 50 }).notNull(),
    topicKey: varchar('topic_key', { length: 50 }).notNull(),
    parentId: uuid('parent_id'), // self-referencing FK defined in custom SQL
    content: text('content').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_topic_posts_topic').on(table.topicType, table.topicKey),
    index('idx_topic_posts_user').on(table.userId),
    index('idx_topic_posts_parent').on(table.parentId),
  ]
);

export type TopicPost = typeof topicPosts.$inferSelect;
export type NewTopicPost = typeof topicPosts.$inferInsert;

// Topic Post Likes
export const topicPostLikes = pgTable(
  'topic_post_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    postId: uuid('post_id')
      .notNull()
      .references(() => topicPosts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_topic_post_like').on(table.userId, table.postId),
    index('idx_topic_post_likes_post').on(table.postId),
    index('idx_topic_post_likes_user').on(table.userId),
  ]
);

export type TopicPostLike = typeof topicPostLikes.$inferSelect;
export type NewTopicPostLike = typeof topicPostLikes.$inferInsert;

// Follows
export const follows = pgTable(
  'follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: uuid('follower_id').notNull(), // references auth.users — FK defined in custom SQL
    followingId: uuid('following_id').notNull(), // references auth.users — FK defined in custom SQL
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_follow').on(table.followerId, table.followingId),
    index('idx_follows_follower').on(table.followerId),
    index('idx_follows_following').on(table.followingId),
  ]
);

export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;

// Blocks
export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id').notNull(), // references auth.users — FK defined in custom SQL
    blockedId: uuid('blocked_id').notNull(), // references auth.users — FK defined in custom SQL
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_block').on(table.blockerId, table.blockedId),
    index('idx_blocks_blocker').on(table.blockerId),
    index('idx_blocks_blocked').on(table.blockedId),
  ]
);

export type Block = typeof blocks.$inferSelect;
export type NewBlock = typeof blocks.$inferInsert;

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
export const moderationActions = pgTable(
  'moderation_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').notNull(), // references auth.users — FK defined in custom SQL
    action: varchar('action', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: uuid('target_id').notNull(),
    reason: text('reason'),
    metadata: jsonb('metadata').default({}),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_moderation_actions_actor').on(table.actorId),
    index('idx_moderation_actions_target').on(table.targetType, table.targetId),
    index('idx_moderation_actions_action').on(table.action),
    index('idx_moderation_actions_created').on(table.createdAt),
  ]
);

export type ModerationAction = typeof moderationActions.$inferSelect;
export type NewModerationAction = typeof moderationActions.$inferInsert;

/**
 * Rate Limit Events — fixed-window counter for user action throttling.
 *
 * @description
 * Records each rate-limited action performed by a user. The `checkRateLimit` function
 * counts events within a time window to decide whether to allow or reject new actions.
 *
 * @design PostgreSQL-based, not Redis (see Issue #18)
 *
 * This project already uses PostgreSQL (Supabase) and has no Redis dependency.
 * Adding Redis solely for rate limiting would increase infrastructure complexity
 * disproportionately to the traffic level of this application. PostgreSQL with
 * proper indexing handles the expected load well.
 *
 * @design No cleanup mechanism (YAGNI)
 *
 * Old events are not automatically deleted. A cleanup job (e.g., pg_cron) can be
 * added later if the table grows to a problematic size.
 */
export const rateLimitEvents = pgTable(
  'rate_limit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_rate_limit_events_lookup').on(table.userId, table.action, table.createdAt)]
);

export type RateLimitEvent = typeof rateLimitEvents.$inferSelect;
export type NewRateLimitEvent = typeof rateLimitEvents.$inferInsert;

/**
 * User Activity Log — immutable event log for user actions.
 *
 * @design Follows the same immutable event log pattern as `moderation_actions`
 *
 * Tracks user-initiated actions (post creation/deletion, likes, follows, blocks,
 * profile edits, logins) for analytics and admin visibility. Append-only — no
 * UPDATE or DELETE RLS policies.
 *
 * @design Polymorphic target_type + target_id
 *
 * Consistent with `moderation_actions` and `topicPosts.topicType + topicKey`.
 * target_type/target_id are optional because some actions (e.g., login, profile edit)
 * don't have an external target entity.
 *
 * @design action is varchar, not pgEnum
 *
 * New action types will be added incrementally. Using varchar avoids requiring
 * an ALTER TYPE migration for each new action.
 *
 * @design metadata (JSONB) for flexible context
 *
 * Stores action-specific data (e.g., topic key for post creation, changed fields
 * for profile edits). Extensible without schema changes.
 *
 * @design No updated_at — activity logs are immutable
 *
 * Records are append-only. No UPDATE or DELETE RLS policies are defined.
 *
 * @design FKs managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`.
 */
export const userActivityLog = pgTable(
  'user_activity_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    action: varchar('action', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_activity_log_user').on(table.userId),
    index('idx_user_activity_log_action').on(table.action),
    index('idx_user_activity_log_target').on(table.targetType, table.targetId),
    index('idx_user_activity_log_created').on(table.createdAt),
  ]
);

export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type NewUserActivityLog = typeof userActivityLog.$inferInsert;

// Site Settings
export const siteSettings = pgTable('site_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: jsonb('value').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type NewSiteSetting = typeof siteSettings.$inferInsert;

// Ad Banners
export const adBanners = pgTable(
  'ad_banners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slot: varchar('slot', { length: 50 }).unique().notNull(),
    href: varchar('href', { length: 2048 }).notNull(),
    imagePath: varchar('image_path', { length: 1024 }).notNull(),
    alt: varchar('alt', { length: 255 }).notNull().default('Advertisement'),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').default(0),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_ad_banners_active').on(table.isActive)]
);

export type AdBannerRecord = typeof adBanners.$inferSelect;
export type NewAdBannerRecord = typeof adBanners.$inferInsert;

// Notifications
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    actorId: uuid('actor_id'),
    type: varchar('type', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }),
    targetId: uuid('target_id'),
    groupKey: varchar('group_key', { length: 255 }),
    metadata: jsonb('metadata').default({}),
    read: boolean('read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_user_created').on(table.userId, table.createdAt),
    index('idx_notifications_unread')
      .on(table.userId)
      .where(sql`read = false`),
    index('idx_notifications_dedup').on(
      table.userId,
      table.type,
      table.actorId,
      table.targetType,
      table.targetId
    ),
    index('idx_notifications_group_key').on(table.userId, table.groupKey),
    index('idx_notifications_actor').on(table.actorId),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
