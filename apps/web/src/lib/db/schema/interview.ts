// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — interview.
//
// User interview answers — onboarding-style profile prompts surfaced on
// /interview.
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

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
