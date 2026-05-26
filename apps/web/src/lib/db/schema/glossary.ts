// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — glossary.
//
// Glossary domain: terms, per-locale translations, search aliases, position
// examples (with board annotations), and term-to-term relations.
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { BoardAnnotations } from '@/lib/board-annotations/types';

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

const EMPTY_BOARD_ANNOTATIONS_DEFAULT: BoardAnnotations = { arrows: [], circles: [] };
/**
 * @design is_theme — opt-in flag for theme tagging
 * `is_theme` controls whether a term is selectable as a theme tag on
 * positions (via `position_themes`). Default is `false`: many glossary
 * entries (e.g. "Calculation", "Flank", "Algebraic notation") describe
 * concepts or vocabulary that do not meaningfully tag specific positions
 * and would be noise in a theme picker. Admins flip this flag on for the
 * subset of terms that work as position tags (pin, passed pawn, battery,
 * fianchetto, etc.). The DB-level RLS policy on `position_themes` also
 * enforces `is_theme = true`, so the column is the canonical gate, not a
 * UI-only convention.
 */
export const glossaryTerms = pgTable('glossary_terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  termEn: varchar('term_en', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  isTheme: boolean('is_theme').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
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
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
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
    /**
     * Display-only board markup (arrows and squares to highlight) drawn on
     * top of the example board. Many glossary entries — `pin`, `skewer`,
     * `discovered-attack` — are unintelligible without indicating WHICH
     * piece is pinned / skewered / hidden, so the annotation lives on each
     * (term, fen) pair rather than on the FEN itself: the same position may
     * illustrate different terms with different arrows.
     *
     * Schema: `{ arrows: Arrow[]; circles: Circle[] }`. See
     * `apps/web/src/lib/board-annotations/types.ts`. JSONB shape validation
     * is enforced at the application layer via `parseBoardAnnotations`.
     */
    annotations: jsonb('annotations')
      .$type<BoardAnnotations>()
      .notNull()
      .default(EMPTY_BOARD_ANNOTATIONS_DEFAULT),
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
