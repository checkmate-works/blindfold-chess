// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — articles.
//
// Editorial content: article categories, articles, images, tags, article ↔ tag
// join, article-embedded practice modules, and announcements (the long-form
// announcement system shown in the public 'Announcements' page).
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * @design updated_at update policy
 *
 * For every table with an `updated_at` column, the timestamp is refreshed
 * automatically by Drizzle via `.$onUpdateFn(() => new Date())`. When adding a
 * new table that has an `updated_at` column, always attach this callback.
 *
 * Exceptions:
 * - `profiles`: updated by a Supabase BEFORE UPDATE trigger
 *   (`profiles_updated_at`). Because `profiles` can be written through
 *   internal Supabase paths that go via `auth.users` (e.g. auth hooks), the
 *   timestamp update is centralized at the DB trigger layer instead of
 *   `$onUpdateFn`. See the `@design` note on the `profiles` table
 *   definition for details.
 *
 * Existing call sites still contain several explicit
 * `set({ updatedAt: new Date() })` statements. They are redundant but
 * harmless and act as a fail-safe if an UPDATE path that bypasses Drizzle
 * is introduced in the future.
 */
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
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
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
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
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
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    unique('uq_announcements_slug_locale').on(table.slug, table.locale),
    index('idx_announcements_status_published').on(table.status, table.publishedAt),
  ]
);

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
