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
    contentJson: jsonb('content_json'),
    contentFormat: varchar('content_format', { length: 20 }).notNull().default('markdown'),
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

// Article Images (intermediate table for Supabase Storage managed images)
export const articleImages = pgTable(
  'article_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    storagePath: varchar('storage_path', { length: 1024 }).notNull(),
    publicUrl: varchar('public_url', { length: 2048 }).notNull(),
    altText: varchar('alt_text', { length: 255 }),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    fileSize: integer('file_size').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_article_images_article').on(table.articleId)]
);

export type ArticleImage = typeof articleImages.$inferSelect;
export type NewArticleImage = typeof articleImages.$inferInsert;

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
  (table) => [
    unique('uq_announcements_slug_locale').on(table.slug, table.locale),
    index('idx_announcements_status_published').on(table.status, table.publishedAt),
  ]
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
 * @design Flat URL slugs — no hierarchical paths
 *
 * Although parentSlug models a tree, URLs remain flat (/openings/kings-gambit-declined,
 * not /openings/kings-gambit/declined). The slug is used as topicKey in topicPosts and
 * as answerValue in userInterviewAnswers; hierarchical paths would require reverse-mapping
 * logic with no SEO or UX benefit. Hierarchy is expressed in the UI (breadcrumbs) instead.
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
    parentSlug: varchar('parent_slug', { length: 100 }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_chess_openings_first_move_square').on(table.firstMoveSquare),
    index('idx_chess_openings_eco_code').on(table.ecoCode),
    index('idx_chess_openings_parent_slug').on(table.parentSlug),
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

/**
 * Feed Items — materialized timeline feed for the home page.
 *
 * @description
 * Stores feed entries for the timeline. Each user action that should appear
 * in the feed (e.g., creating a topic post) inserts a row here. The home page
 * queries this single table with cursor-based pagination for efficient,
 * chronological feed display.
 *
 * @design Materialized feed (not UNION query)
 *
 * A dedicated table optimizes reads (the dominant operation for a timeline).
 * `ORDER BY created_at DESC LIMIT N` on a single indexed table is far more
 * efficient than merging multiple source tables via UNION. It also enables
 * simple cursor-based pagination and future personalization (filtering by
 * followed users via `actor_id`).
 *
 * @design entityType is varchar, not pgEnum
 *
 * New feed item types (likes, follows, achievements, etc.) will be added
 * incrementally. Using varchar avoids requiring an ALTER TYPE migration
 * for each new type.
 *
 * @design metadata (JSONB) for entity-type-specific data
 *
 * Stores supplementary data needed for list display without JOINs
 * (e.g., `{ topicType: 'square', topicKey: 'e4' }` for topic_post items).
 * Detailed data is fetched via JOIN when constructing the full feed response.
 *
 * @design FKs managed in custom SQL
 *
 * `actorId` -> `auth.users` is defined in Supabase-side SQL (not Drizzle
 * references), following the same pattern as `profiles.id`.
 */
export const feedItems = pgTable(
  'feed_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    actorId: uuid('actor_id').notNull(), // references auth.users — FK defined in custom SQL
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_feed_items_created').on(table.createdAt),
    index('idx_feed_items_actor').on(table.actorId),
    index('idx_feed_items_entity').on(table.entityType, table.entityId),
  ]
);

export type FeedItem = typeof feedItems.$inferSelect;
export type NewFeedItem = typeof feedItems.$inferInsert;

/**
 * Stripe Customers -- Supabase user to Stripe customer mapping.
 *
 * @description
 * Maps Supabase Auth user IDs to Stripe customer IDs (1:1).
 * Used as the `customer` parameter when creating Stripe Checkout sessions,
 * preventing duplicate Stripe customers for the same user.
 *
 * @design 1 user = 1 Stripe customer (UNIQUE constraint on userId)
 *
 * On first Checkout, a Stripe customer is created and stored here.
 * Subsequent Checkouts reuse the existing customer ID.
 *
 * @design FKs managed in custom SQL
 *
 * `userId` -> `auth.users` is defined in Supabase-side SQL,
 * following the same pattern as `profiles.id`.
 */
export const stripeCustomers = pgTable('stripe_customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().notNull(), // references auth.users -- FK defined in custom SQL
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type StripeCustomer = typeof stripeCustomers.$inferSelect;
export type NewStripeCustomer = typeof stripeCustomers.$inferInsert;

/**
 * Subscriptions -- Stripe subscription state mirror.
 *
 * @description
 * Mirrors Stripe subscription state in the local DB. Updated by Webhook
 * events and queried to determine ad visibility per user.
 *
 * @design status is varchar, not pgEnum
 *
 * Stripe subscription statuses ('active', 'canceled', 'incomplete',
 * 'incomplete_expired', 'past_due', 'trialing', 'unpaid', 'paused')
 * may change in the future. varchar avoids ALTER TYPE migrations.
 * Consistent with the project's existing pattern (topicType, action, etc.).
 *
 * @design No UNIQUE on userId (multi-subscription support)
 *
 * Stripe allows a customer to have multiple subscriptions. While the initial
 * scope is a single plan, this design supports future multi-plan scenarios.
 * UNIQUE is on stripeSubscriptionId instead.
 *
 * @design stripePriceId for future multi-plan identification
 *
 * Stores the Stripe Price ID to identify which plan a subscription belongs to.
 * Enables future expansion (e.g., $1/month ad-free + $5/month premium).
 *
 * @design cancelAtPeriodEnd flag
 *
 * When a user cancels, Stripe sets cancel_at_period_end=true but keeps
 * status='active' until the period ends. This flag enables "cancellation
 * scheduled" UI without losing ad-free access during the remaining period.
 *
 * @design FKs managed in custom SQL
 *
 * `userId` -> `auth.users` is defined in Supabase-side SQL.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users -- FK defined in custom SQL
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique().notNull(),
    stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(), // Stripe subscription status
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_subscriptions_user').on(table.userId),
    index('idx_subscriptions_stripe_sub').on(table.stripeSubscriptionId),
    index('idx_subscriptions_status').on(table.userId, table.status),
  ]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

/**
 * @design Partial unique constraint (userId, questionKey) WHERE deletedAt IS NULL
 *
 * Currently each user can have at most one active answer per question.
 * This constraint may be relaxed in the future to allow multiple active
 * answers (e.g., listing several favorite openings). The partial unique
 * index is defined in the migration SQL, not in Drizzle schema, because
 * Drizzle ORM does not support partial (filtered) unique indexes.
 */
export const userInterviewAnswers = pgTable(
  'user_interview_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    questionKey: varchar('question_key', { length: 50 }).notNull(),
    answerValue: varchar('answer_value', { length: 500 }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_interview_answers_question').on(table.questionKey),
    index('idx_user_interview_answers_user').on(table.userId),
  ]
);

export type UserInterviewAnswer = typeof userInterviewAnswers.$inferSelect;
export type NewUserInterviewAnswer = typeof userInterviewAnswers.$inferInsert;

/**
 * Ranks — master data for the belt/ranking system (級・段位).
 *
 * @description
 * Stores rank definitions for the progression system inspired by martial arts
 * belt rankings. Users progress linearly from 5級 through 初段 to 10段.
 * This table is admin-managed master data (read-only for users).
 *
 * @design slug as URL segment and i18n key source
 *
 * `slug` serves as both the URL path segment (e.g., `/ranks/5kyu`) and the
 * base for next-intl translation keys (e.g., `ranks.5kyu.name` → "5級" / "5th Kyū").
 * Display names are managed in message files, not in the database, keeping i18n
 * consistent with the rest of the application. Follows the same pattern as
 * `articleCategories.slug` and `chessOpenings.slug`.
 *
 * @design Linear progression via `level` integer
 *
 * Each rank has a numeric `level` value (e.g., 5級=10, 4級=20, 初段=110)
 * with gaps between values to allow future insertion of intermediate ranks
 * without renumbering. Unlock logic is simply `target.level > user.currentLevel`.
 * This enables trivial "next rank" queries and progress bar calculations.
 *
 * @design requirements as JSONB, not a normalized table
 *
 * Each rank can have multiple achievement conditions (challenge scores, post counts,
 * like counts, etc.) with heterogeneous schemas. A normalized `rank_requirements`
 * table would require either wide NULL-heavy columns or a polymorphic EAV pattern.
 * JSONB keeps the schema simple for a small, admin-managed dataset (~15 rows).
 * Validation is enforced at the application layer via Zod schemas, not at the DB level.
 *
 * @design No updatedAt — master data changes are infrequent
 *
 * Rank definitions are seeded via migration/script and rarely modified.
 * When changes occur, they are tracked through migration history.
 * Consistent with `articleCategories` which also omits updatedAt.
 *
 * @design color is varchar, not pgEnum
 *
 * Belt colors may expand or change. varchar avoids ALTER TYPE migrations,
 * consistent with the project's established pattern (topicType, action, etc.).
 *
 * @design No currentRankId cache on profiles (YAGNI)
 *
 * The user's current rank can be derived from `user_ranks` via JOIN + MAX(level).
 * With at most ~15 rows per user, this is trivially fast. A materialized cache
 * column on `profiles` (like `bannedAt`) was considered but deferred — it adds
 * complexity (atomicity, RLS write protection, race conditions) without proven
 * need. If profile-page rank display becomes a performance bottleneck, add
 * `profiles.current_rank_id` as a denormalized cache at that point.
 */
export const ranks = pgTable('ranks', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 50 }).unique().notNull(),
  level: integer('level').notNull().unique(),
  color: varchar('color', { length: 20 }),
  requirements: jsonb('requirements').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Rank = typeof ranks.$inferSelect;
export type NewRank = typeof ranks.$inferInsert;

/**
 * User Ranks — immutable achievement history for rank progression.
 *
 * @description
 * Records when a user achieves a rank. Once inserted, records are never
 * updated or deleted — acquired ranks are never revoked, even if rank
 * requirements are later modified (grandfathering principle).
 *
 * @design Immutable, append-only (no updatedAt)
 *
 * This table is INSERT-only by design. The absence of `updatedAt` signals
 * immutability. Corrections (e.g., cheater removal) would be handled via
 * admin moderation actions, not row updates.
 *
 * @design onDelete: 'restrict' — protect history from master data deletion
 *
 * If a rank needs to be retired, it should be handled via logical deletion
 * (adding a deprecatedAt column to ranks) rather than physical deletion.
 * CASCADE would violate the immutability guarantee of achievement records.
 *
 * @design INSERT restricted to service role (Server Action only)
 *
 * Users must not be able to self-insert rank achievements. All rank
 * granting is done server-side after validating achievement conditions.
 * RLS grants SELECT only to authenticated; no INSERT/UPDATE/DELETE policies.
 *
 * @design FKs managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`.
 *
 * @design achievedAt serves as the creation timestamp
 *
 * This table omits the conventional `createdAt` column. `achievedAt` records
 * when the rank was earned, which is always the insertion time (defaultNow()).
 * A separate `createdAt` would be redundant. If backdated rank grants become
 * necessary in the future, `achievedAt` can be set explicitly while adding
 * a `createdAt` column for audit purposes.
 */
export const userRanks = pgTable(
  'user_ranks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    rankId: uuid('rank_id')
      .notNull()
      .references(() => ranks.id, { onDelete: 'restrict' }),
    achievedAt: timestamp('achieved_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_user_rank').on(table.userId, table.rankId),
    index('idx_user_ranks_user').on(table.userId),
  ]
);

export type UserRank = typeof userRanks.$inferSelect;
export type NewUserRank = typeof userRanks.$inferInsert;

/**
 * Achievements — master data for achievement badges (実績バッジ).
 *
 * @description
 * Stores achievement definitions for the badge system. Each row defines a
 * distinct achievement that users can unlock by meeting specific criteria.
 * This table is admin-managed master data (read-only for users).
 *
 * @design Completely separate from the rank system (ranks table)
 *
 * Ranks represent skill-level progression (段級位: linear 5級→初段→10段),
 * while achievements represent individual accomplishments unlocked by specific
 * actions or milestones. A user progresses through ranks sequentially, but can
 * unlock achievements in any order. The two systems coexist independently.
 *
 * @design slug as URL path segment and i18n key source
 *
 * `slug` serves as both the URL path segment (e.g., `/achievements/first-blood`)
 * and the base for next-intl translation keys (e.g., `achievements.first-blood.name`).
 * Display names are managed in message files, not in the database, keeping i18n
 * consistent with the rest of the application. Follows the same pattern as
 * `ranks.slug`, `articleCategories.slug`, and `chessOpenings.slug`.
 *
 * @design category is varchar, not pgEnum
 *
 * New achievement categories (`monthly_leaderboard`, `cumulative`, `streak`,
 * `one_shot`, `social`, `ai_defeat`, etc.) will be added incrementally.
 * Using varchar avoids requiring an ALTER TYPE migration for each new category.
 * Consistent with the project's established pattern (topicType, action, etc.).
 *
 * @design criteria as JSONB — category-specific judgment conditions
 *
 * Each achievement category has a different condition schema (e.g., leaderboard
 * placement for monthly_leaderboard, threshold count for cumulative, consecutive
 * days for streak). JSONB allows storing these heterogeneous schemas in a single
 * column without schema changes per category. Follows the same approach as
 * `ranks.requirements`. Type safety is enforced at the application layer via
 * the `AchievementCriteria` discriminated union type. The default value `{}`
 * is a pre-seed placeholder; when parsing into `AchievementCriteria`, the
 * application layer must validate the shape and reject/handle empty objects.
 *
 * @design repeatable flag for recurring vs one-time achievements
 *
 * When `repeatable` is true, the achievement can be granted multiple times
 * (e.g., monthly leaderboard badges awarded each month). When false, the
 * achievement is a one-time unlock (e.g., "first perfect score"). Duplicate
 * prevention for repeatable badges is handled at the application layer by
 * checking `user_achievements.metadata` (e.g., year/month).
 *
 * @design No updatedAt — master data changes are infrequent
 *
 * Achievement definitions are seeded via migration/script and rarely modified.
 * When changes occur, they are tracked through migration history.
 * Consistent with `ranks` which also omits updatedAt.
 */
export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  iconKey: varchar('icon_key', { length: 100 }).notNull(),
  criteria: jsonb('criteria').notNull().default({}),
  displayOrder: integer('display_order').notNull().default(0),
  repeatable: boolean('repeatable').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;

/**
 * User Achievements — immutable achievement history (実績解除ログ).
 *
 * @description
 * Records when a user unlocks an achievement. This table is an immutable,
 * append-only log (INSERT-only, no updatedAt). Once inserted, records are
 * never updated or deleted. Follows the same immutability pattern as
 * `user_ranks`.
 *
 * @design metadata for grant context
 *
 * Stores context about why/when the achievement was granted. For monthly
 * leaderboard badges, this includes `{ year, month, score, placement }`.
 * For cumulative achievements, it might include `{ totalCount }`.
 * This enables audit trails and display of achievement details without
 * re-querying the original data source.
 *
 * @design FKs for userId managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`, `userRanks.userId`, etc. This is
 * because `auth.users` lives in a separate Supabase-managed schema that Drizzle
 * does not control.
 *
 * @design onDelete: 'restrict' on achievementId — protect history from master data deletion
 *
 * If an achievement definition needs to be retired, it should be handled via
 * logical deletion rather than physical deletion. CASCADE would violate the
 * immutability guarantee of achievement records. Follows the same pattern as
 * `userRanks.rankId` → `ranks.id`.
 *
 * @design Repeatable badge deduplication is application-layer responsibility
 *
 * For repeatable achievements (e.g., monthly leaderboard badges), the application
 * layer must check `metadata` fields (e.g., year/month) before inserting to prevent
 * unintended duplicates. The database does not enforce uniqueness on (userId,
 * achievementId) because repeatable badges legitimately have multiple rows.
 *
 * @design achievedAt serves as the creation timestamp
 *
 * This table omits the conventional `createdAt` column. `achievedAt` records
 * when the achievement was unlocked, which is always the insertion time
 * (defaultNow()). Follows the same pattern as `userRanks.achievedAt`.
 */
export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    achievementId: uuid('achievement_id')
      .notNull()
      .references(() => achievements.id, { onDelete: 'restrict' }),
    metadata: jsonb('metadata').default({}),
    achievedAt: timestamp('achieved_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_achievements_achievement').on(table.achievementId),
    index('idx_user_achievements_user_achievement').on(table.userId, table.achievementId),
  ]
);

export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;

/**
 * Exp Events — append-only log of all Exp grants (経験値イベントログ).
 *
 * @description
 * Records every Exp grant event. This table is the source of truth for
 * Exp history and audit. Append-only: rows are never updated or deleted.
 *
 * @design Two-table architecture (event log + cache)
 *
 * Exp data is split into two tables with different responsibilities:
 * - `exp_events`: append-only log of all Exp grants (INSERT only).
 *   Used for per-user Exp history and auditing.
 * - `user_exp`: materialized cumulative Exp per user, maintained via
 *   service-role-only writes. Serves as the source for leaderboard
 *   rankings and profile display.
 *
 * @design source + source_id for traceability
 *
 * `source` identifies the subsystem that generated the Exp grant
 * (e.g., 'challenge_result'). `source_id` optionally references the
 * originating record's ID for audit trails. Together they enable
 * tracing any Exp grant back to its origin.
 *
 * @design metadata (JSONB) for extensible context
 *
 * Stores grant-specific context (e.g., score details, bonus multipliers)
 * without requiring schema changes. Follows the same pattern as
 * `userAchievements.metadata` and `moderationActions.metadata`.
 *
 * @design FKs for userId managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`, `userRanks.userId`, etc.
 *
 * @design No updatedAt — append-only by design
 *
 * This table is immutable. Once inserted, records are never updated or
 * deleted. `createdAt` serves as the sole timestamp.
 */
export const expEvents = pgTable(
  'exp_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    source: varchar('source', { length: 50 }).notNull(),
    sourceId: uuid('source_id'),
    menuType: varchar('menu_type', { length: 30 }),
    amount: integer('amount').notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_exp_events_user_created').on(table.userId, table.createdAt),
    index('idx_exp_events_source').on(table.source, table.sourceId),
    index('idx_exp_events_user_source_created').on(table.userId, table.source, table.createdAt),
  ]
);

export type ExpEvent = typeof expEvents.$inferSelect;
export type NewExpEvent = typeof expEvents.$inferInsert;

/**
 * User Exp — cumulative Exp cache per user (累計Expキャッシュ).
 *
 * @description
 * Maintains exactly one row per user, representing the user's total
 * accumulated Exp. Updated via service-role-only writes whenever new
 * Exp is granted. Used for leaderboard rankings and profile display.
 *
 * @design Materialized cache, rebuildable from exp_events
 *
 * This table is a denormalized cache. If data correction is needed,
 * the total can be recalculated from `exp_events` using
 * `SUM(amount) GROUP BY user_id`. Follows the same cache pattern as
 * `challenge_best_scores`.
 *
 * @design Service-role-only writes
 *
 * INSERT and UPDATE are restricted to the service role to ensure
 * consistency. Client-side code cannot directly modify Exp totals.
 * RLS allows SELECT for authenticated and anon (leaderboard display).
 *
 * @design FKs for userId managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`, `userRanks.userId`, etc.
 */
export const userExp = pgTable(
  'user_exp',
  {
    userId: uuid('user_id').primaryKey().notNull(), // references auth.users — FK defined in custom SQL
    totalExp: integer('total_exp').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_user_exp_total').on(table.totalExp)]
);

export type UserExpRecord = typeof userExp.$inferSelect;
export type NewUserExpRecord = typeof userExp.$inferInsert;

/**
 * User Grants — time-limited benefit grants for users.
 *
 * @description
 * Stores grants that provide users with time-limited benefits such as ad-free
 * access or paywall content access. Grants can be issued manually by admins,
 * automatically by system triggers (e.g., topic post), or via campaigns.
 *
 * @design Additive duration model
 *
 * When a new grant is created, its `startsAt` is set to the later of the current
 * time and the latest existing `expiresAt` for the same user+benefitType. This
 * "stacks" grants so that multiple grants extend the benefit period rather than
 * overlapping or resetting it.
 *
 * @design benefitType + grantType are varchar, not pgEnum
 *
 * New benefit types ('ad_free', 'paywall_access', etc.) and grant types
 * ('admin_manual', 'topic_post', 'campaign', etc.) will be added incrementally.
 * Using varchar avoids requiring an ALTER TYPE migration for each new type.
 * Consistent with the project's existing pattern (topicType, action, etc.).
 *
 * @design resourceType + resourceId for scoped grants
 *
 * Global benefits (e.g., ad_free) have NULL resourceType/resourceId.
 * Scoped benefits (e.g., paywall access to a specific article) specify the
 * resource. This avoids separate tables for global vs. scoped grants.
 *
 * @design revokedAt for logical deletion
 *
 * Grants are never physically deleted. Revocation sets revokedAt, preserving
 * the full audit trail. The granted_by info is tracked via moderation_actions
 * (the existing audit log), not duplicated here.
 *
 * @design No updatedAt — grants are effectively immutable
 *
 * Once created, grants are not modified (only revoked via revokedAt).
 * This follows the same immutability pattern as user_ranks.
 *
 * @design FKs managed in custom SQL
 *
 * `userId` → `auth.users` is defined in Supabase-side SQL (not Drizzle references),
 * following the same pattern as `profiles.id`.
 */
export const userGrants = pgTable(
  'user_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    benefitType: varchar('benefit_type', { length: 50 }).notNull(), // 'ad_free', 'paywall_access', etc.
    grantType: varchar('grant_type', { length: 50 }).notNull(), // 'admin_manual', 'topic_post', 'campaign', etc.
    resourceType: varchar('resource_type', { length: 50 }), // NULL for global benefits, 'article' etc. for scoped
    resourceId: varchar('resource_id', { length: 255 }), // NULL for global benefits, target resource ID for scoped
    reason: text('reason'), // Human-readable justification (admin memo, campaign name, etc.)
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_user_grants_benefit_lookup').on(table.userId, table.benefitType, table.expiresAt),
    index('idx_user_grants_user').on(table.userId),
  ]
);

export type UserGrant = typeof userGrants.$inferSelect;
export type NewUserGrant = typeof userGrants.$inferInsert;

/**
 * Positions — user-submitted chess positions for various practice modules.
 *
 * @description
 * A generic table that holds user-submitted chess positions.
 * Used across multiple practice modules: position-memory, puzzles,
 * move-sequence, and future modules that need a stored FEN with metadata.
 *
 * @design FEN の一意性制約なし
 * The same FEN may appear in multiple rows with different titles and
 * descriptions — each is treated as a distinct problem.
 *
 * @design `updated_at` なし
 * Positions are immutable after creation — editing is not supported.
 * The column is intentionally omitted.
 *
 * @design `type` は varchar（pgEnum ではない）
 * Follows the existing `topicType` pattern. New type values (e.g. 'puzzle',
 * 'sequence') can be added without ALTER TYPE migrations.
 *
 * @design FKs managed in custom SQL
 * `userId` → `auth.users` is defined in Supabase-side SQL, not Drizzle
 * references, following the same pattern as `profiles.id` and
 * `topicPosts.userId`.
 *
 * @design 論理削除
 * `deletedAt` enables soft-delete. Rows with a non-null `deletedAt` are
 * treated as 404 by the application layer.
 */
export const positions = pgTable(
  'positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users — FK defined in custom SQL
    type: varchar('type', { length: 50 }).notNull(), // 'memory', 'puzzle', 'sequence', etc.
    fen: varchar('fen', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_positions_user').on(table.userId),
    index('idx_positions_type').on(table.type),
  ]
);

export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;

// Position Tags (junction table)
export const positionTags = pgTable(
  'position_tags',
  {
    positionId: uuid('position_id')
      .notNull()
      .references(() => positions.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [unique('uq_position_tag').on(table.positionId, table.tagId)]
);

export type PositionTag = typeof positionTags.$inferSelect;
export type NewPositionTag = typeof positionTags.$inferInsert;
