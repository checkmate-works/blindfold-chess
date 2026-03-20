import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Article Categories
export const articleCategories = pgTable('article_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ArticleCategory = typeof articleCategories.$inferSelect;
export type NewArticleCategory = typeof articleCategories.$inferInsert;

// Article Category Translations
export const articleCategoryTranslations = pgTable(
  'article_category_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => articleCategories.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 10 }).notNull(), // BCP 47
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('uq_category_translation_locale').on(table.categoryId, table.locale)]
);

export type ArticleCategoryTranslation = typeof articleCategoryTranslations.$inferSelect;
export type NewArticleCategoryTranslation = typeof articleCategoryTranslations.$inferInsert;

// Articles
export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    excerpt: text('excerpt'),
    description: text('description'),
    content: text('content').notNull(),
    locale: varchar('locale', { length: 10 }).notNull(), // BCP 47
    status: varchar('status', { length: 20 }).default('draft'),
    categoryId: uuid('category_id').references(() => articleCategories.id),
    displayOrder: integer('display_order').notNull().default(0),
    icon: varchar('icon', { length: 10 }),
    pinnedAt: timestamp('pinned_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_articles_slug_locale').on(table.slug, table.locale),
    index('idx_articles_category').on(table.categoryId),
  ]
);

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

// Tags
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

// Article Tags (junction table)
export const articleTags = pgTable(
  'article_tags',
  {
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [unique('uq_article_tag').on(table.articleId, table.tagId)]
);

export type ArticleTag = typeof articleTags.$inferSelect;
export type NewArticleTag = typeof articleTags.$inferInsert;

// Article Practice Modules (junction table)
export const articlePracticeModules = pgTable(
  'article_practice_modules',
  {
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    practiceModuleId: varchar('practice_module_id', { length: 100 }).notNull(),
    displayOrder: integer('display_order').notNull().default(0),
  },
  (table) => [unique('uq_article_practice_module').on(table.articleId, table.practiceModuleId)]
);

export type ArticlePracticeModule = typeof articlePracticeModules.$inferSelect;
export type NewArticlePracticeModule = typeof articlePracticeModules.$inferInsert;

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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('uq_term_locale').on(table.termId, table.locale)]
);

export const glossaryTermAliases = pgTable(
  'glossary_term_aliases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    termId: uuid('term_id')
      .notNull()
      .references(() => glossaryTerms.id, { onDelete: 'cascade' }),
    alias: varchar('alias', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('uq_term_alias').on(table.termId, table.alias)]
);

export const glossaryTermPositions = pgTable(
  'glossary_term_positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    termId: uuid('term_id')
      .notNull()
      .references(() => glossaryTerms.id, { onDelete: 'cascade' }),
    fen: varchar('fen', { length: 100 }).notNull(),
    sortOrder: integer('sort_order').default(0),
    caption: varchar('caption', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('uq_term_position').on(table.termId, table.fen)]
);

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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('uq_term_relation').on(table.termId, table.relatedTermId)]
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

/**
 * Profiles
 *
 * Note: email is intentionally omitted — it is managed by Supabase Auth
 * (auth.users) as the single source of truth. Do not duplicate it here
 * to avoid denormalization. Use a JOIN or the Admin API when needed.
 */
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
  xUsername: varchar('x_username', { length: 15 }),
  instagramUsername: varchar('instagram_username', { length: 30 }),
  youtubeHandle: varchar('youtube_handle', { length: 30 }),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
 * @design reply_permission — poster-controlled reply restriction (X/Twitter model)
 *
 * Controls who can reply to a post, inspired by X/Twitter's reply restriction feature.
 * Allowed values: 'everyone' (default), 'followers', 'nobody'.
 * - 'everyone': anyone can reply (standard behavior)
 * - 'followers': only users who follow the post author can reply
 * - 'nobody': replies are disabled entirely
 * Uses varchar instead of pgEnum for extensibility — future values like
 * 'approval_required' can be added without ALTER TYPE migrations.
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
    rootPostId: uuid('root_post_id'), // top-level post of the thread; NULL for top-level posts
    content: text('content').notNull(),
    replyPermission: varchar('reply_permission', { length: 20 }).notNull().default('everyone'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_topic_posts_topic').on(table.topicType, table.topicKey),
    index('idx_topic_posts_user').on(table.userId),
    index('idx_topic_posts_parent').on(table.parentId),
    index('idx_topic_posts_root').on(table.rootPostId),
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

/**
 * Topic Post Ratings — 1:1 extension of topic_posts for structured ratings.
 *
 * @description
 * Stores structured ratings (preference and proficiency) for topic posts.
 * Used for opening topics where users can rate how much they like an opening
 * and how proficient they are with it, in addition to or instead of free-text content.
 *
 * @design 1:1 relationship with topic_posts via UNIQUE constraint on post_id
 *
 * Not all topic posts have ratings (e.g., square topics are text-only).
 * A separate table avoids NULL-heavy columns on topic_posts and cleanly
 * separates structured ratings from free-text content.
 *
 * @design At least one rating required
 *
 * The CHECK constraint ensures that at least one of preference_rating or
 * proficiency_rating is provided. This prevents empty rating records.
 */
export const topicPostRatings = pgTable(
  'topic_post_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .unique()
      .references(() => topicPosts.id, { onDelete: 'cascade' }),
    preferenceRating: smallint('preference_rating'),
    proficiencyRating: smallint('proficiency_rating'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'chk_rating_range_preference',
      sql`${table.preferenceRating} IS NULL OR (${table.preferenceRating} >= 1 AND ${table.preferenceRating} <= 5)`
    ),
    check(
      'chk_rating_range_proficiency',
      sql`${table.proficiencyRating} IS NULL OR (${table.proficiencyRating} >= 1 AND ${table.proficiencyRating} <= 5)`
    ),
    check(
      'chk_at_least_one_rating',
      sql`${table.preferenceRating} IS NOT NULL OR ${table.proficiencyRating} IS NOT NULL`
    ),
  ]
);

export type TopicPostRating = typeof topicPostRatings.$inferSelect;
export type NewTopicPostRating = typeof topicPostRatings.$inferInsert;

// User Follows
export const userFollows = pgTable(
  'user_follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: uuid('follower_id').notNull(), // references auth.users — FK defined in custom SQL
    followingId: uuid('following_id').notNull(), // references auth.users — FK defined in custom SQL
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
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
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_user_created').on(table.userId, table.createdAt),
    index('idx_notifications_unread')
      .on(table.userId)
      .where(sql`is_read = false`),
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

/**
 * Chess Openings — master data for chess opening families.
 *
 * @description
 * Stores chess opening families (e.g., French Defense, Sicilian Defense) with their
 * representative PGN move sequences and resulting FEN positions. Used as topicKey
 * source for topic_posts with topicType='opening'.
 *
 * @design Master data, not user-generated content
 *
 * This table is seeded via migration/script and managed by admins only.
 * Users cannot create, modify, or delete openings. RLS allows public reads
 * but restricts writes to the service role.
 *
 * @design FEN derived from PGN at seed time
 *
 * The `fen` column stores the board state after executing the `pgn` moves.
 * This is computed at seed time using chess.js (via @blindfold-chess/features/chess-core)
 * to avoid runtime computation.
 *
 * @design slug as topicKey
 *
 * The `slug` column serves as the `topicKey` value when `topicType='opening'`,
 * following the same pattern as other topic types. It appears in URLs
 * (e.g., /topics/openings/french-defense).
 *
 * @design No parent_id — flat structure for now
 *
 * This initial schema stores only opening families (e.g., "Sicilian Defense"),
 * not individual variations (e.g., "Sicilian Najdorf"). A `parent_id` column
 * for hierarchical variation support may be added in a future migration.
 */
export const chessOpenings = pgTable(
  'chess_openings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    ecoCode: varchar('eco_code', { length: 3 }).notNull(),
    pgn: text('pgn').notNull(),
    fen: varchar('fen', { length: 100 }).notNull(),
    firstMoveSquare: varchar('first_move_square', { length: 2 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_chess_openings_first_move_square').on(table.firstMoveSquare),
    index('idx_chess_openings_eco_code').on(table.ecoCode),
  ]
);

export type ChessOpening = typeof chessOpenings.$inferSelect;
export type NewChessOpening = typeof chessOpenings.$inferInsert;

/**
 * Challenge Results — stores all challenge results for period-based rankings.
 *
 * @description
 * Every completed challenge session inserts a row here. This table serves as
 * the source of truth for weekly/monthly rankings (queried with `created_at`
 * filters using `DISTINCT ON` to extract each user's best score per period).
 * All-time rankings are served from `challenge_best_scores` instead.
 *
 * This table also replaces the former `practice_sessions` table — challenge
 * results are now stored directly here instead of in a separate sessions table.
 *
 * @design Two-table architecture (Monkeytype-inspired)
 *
 * Challenge data is split into two tables with different responsibilities:
 * - `challenge_results`: append-only log of all challenge results (INSERT only).
 *   Used for weekly/monthly rankings via `created_at` filtering, and also
 *   serves as the source for per-user history (mypage dashboard).
 * - `challenge_best_scores`: materialized all-time best per user/menu/key,
 *   maintained via UPSERT on each new best score.
 *
 * This avoids expensive full-table scans for all-time rankings while keeping
 * period-based rankings simple (the period's data volume is naturally bounded).
 *
 * @design leaderboardKey — segment key (Monkeytype's `mode2` pattern)
 *
 * A finite, enum-like varchar that segments rankings within a menuType.
 * Each module defines its own key values:
 * - coordinate_quiz: 'white' | 'black' | 'random' (boardOrientation)
 * - legal_moves: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'random' (selectedPiece)
 * - square_colors: 'default'
 *
 * timeLimit is NOT included because it is fixed per module. New modules can
 * define their own key values without schema changes.
 *
 * @design Ranking criteria: score DESC, incorrect_answers ASC, time_taken ASC
 *
 * Three-tier tiebreaker: highest score wins; on tie, fewer mistakes wins;
 * on further tie, faster time wins. The UPSERT comparison in
 * `challenge_best_scores` uses the same ordering via tuple comparison.
 *
 * @design Index sort order — manual DESC/ASC in migration SQL
 *
 * Drizzle ORM's `index().on()` does not support DESC/ASC modifiers, so the
 * snapshot JSON records all columns as ASC. The actual migration SQL has been
 * manually edited to specify the correct sort directions. When modifying these
 * indexes in the future, the migration SQL must be manually adjusted again.
 */
export const challengeResults = pgTable(
  'challenge_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    menuType: varchar('menu_type', { length: 30 }).notNull(),
    leaderboardKey: varchar('leaderboard_key', { length: 20 }).notNull(),
    score: integer('score').notNull(),
    incorrectAnswers: integer('incorrect_answers').notNull().default(0),
    timeTaken: integer('time_taken').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_cr_period_ranking').on(
      table.menuType,
      table.leaderboardKey,
      table.createdAt,
      table.score,
      table.incorrectAnswers,
      table.timeTaken
    ),
    index('idx_cr_user').on(table.userId, table.menuType),
  ]
);

export type ChallengeResult = typeof challengeResults.$inferSelect;
export type NewChallengeResult = typeof challengeResults.$inferInsert;

/**
 * Challenge Best Scores — all-time best score per user/menu/key combination.
 *
 * @description
 * Maintains exactly one row per (userId, menuType, leaderboardKey) combination,
 * representing the user's all-time best score. Updated via UPSERT: on each
 * challenge completion, the new score is compared with the stored best using
 * tuple comparison `(score, -incorrect_answers, -time_taken)`, and the row is
 * updated only if the new result is strictly better.
 *
 * @design UPSERT with tuple comparison for atomicity
 *
 * ```sql
 * INSERT INTO challenge_best_scores (...) VALUES (...)
 * ON CONFLICT (user_id, menu_type, leaderboard_key)
 * DO UPDATE SET ...
 * WHERE (EXCLUDED.score, -EXCLUDED.incorrect_answers, -EXCLUDED.time_taken)
 *     > (challenge_best_scores.score, -challenge_best_scores.incorrect_answers,
 *        -challenge_best_scores.time_taken);
 * ```
 *
 * PostgreSQL's row-level locking on `ON CONFLICT DO UPDATE` guarantees atomicity
 * even under concurrent UPSERTs for the same user/menu/key combination.
 *
 * @design Rebuildable from challenge_results
 *
 * This table is a materialized cache. If data correction is needed (e.g.,
 * cheater removal), the best score can be recalculated from `challenge_results`
 * using `DISTINCT ON (user_id, menu_type, leaderboard_key)`.
 */
export const challengeBestScores = pgTable(
  'challenge_best_scores',
  {
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    menuType: varchar('menu_type', { length: 30 }).notNull(),
    leaderboardKey: varchar('leaderboard_key', { length: 20 }).notNull(),
    score: integer('score').notNull(),
    incorrectAnswers: integer('incorrect_answers').notNull().default(0),
    timeTaken: integer('time_taken').notNull(),
    achievedAt: timestamp('achieved_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.menuType, table.leaderboardKey] }),
    index('idx_cbs_ranking').on(
      table.menuType,
      table.leaderboardKey,
      table.score,
      table.incorrectAnswers,
      table.timeTaken
    ),
  ]
);

export type ChallengeBestScore = typeof challengeBestScores.$inferSelect;
export type NewChallengeBestScore = typeof challengeBestScores.$inferInsert;
