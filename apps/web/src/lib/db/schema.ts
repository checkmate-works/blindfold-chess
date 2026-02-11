import { integer, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

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
