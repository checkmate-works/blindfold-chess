// Auto-split from schema/tables.ts on 2026-05-27. Per-domain
// schema slice — interview.
//
// User interview answers — onboarding-style profile prompts surfaced on
// /interview.
import { index, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

import { createdAtOnly, softDeleteTimestamp } from './columns';

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
    // Nullable: interview answers are retained as anonymous aggregate statistics,
    // so an author's physical purge anonymises the row (FK ON DELETE SET NULL —
    // user_id → NULL) rather than deleting it. Per-user reads filter by the live
    // caller's id, so anonymised rows never surface on anyone's page. FK defined
    // in custom SQL.
    userId: uuid('user_id'), // references auth.users — FK defined in custom SQL
    questionKey: varchar('question_key', { length: 50 }).notNull(),
    answerValue: varchar('answer_value', { length: 500 }).notNull(),
    ...softDeleteTimestamp,
    ...createdAtOnly,
  },
  (table) => [
    index('idx_user_interview_answers_question').on(table.questionKey),
    index('idx_user_interview_answers_user').on(table.userId),
  ]
);

export type UserInterviewAnswer = typeof userInterviewAnswers.$inferSelect;
export type NewUserInterviewAnswer = typeof userInterviewAnswers.$inferInsert;
