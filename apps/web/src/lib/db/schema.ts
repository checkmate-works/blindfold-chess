import {
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

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 50 }).unique().notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id),
  locale: varchar('locale', { length: 10 }).default('en'),
  status: varchar('status', { length: 20 }).default('draft'),
  pinnedAt: timestamp('pinned_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

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
    locale: varchar('locale', { length: 10 }).notNull(),
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
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
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
  country: varchar('country', { length: 2 }),
  flair: varchar('flair', { length: 50 }),
  fideId: varchar('fide_id', { length: 50 }),
  chesscomUsername: varchar('chesscom_username', { length: 255 }),
  lichessUsername: varchar('lichess_username', { length: 255 }),
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
