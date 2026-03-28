ALTER TABLE "user_interview_answers" DROP CONSTRAINT "user_interview_answers_pkey";--> statement-breakpoint
ALTER TABLE "user_interview_answers" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_user_interview_answers_user" ON "user_interview_answers" USING btree ("user_id");--> statement-breakpoint
-- Partial unique index: one active answer per user per question
-- This constraint may be relaxed in the future to allow multiple active answers.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_interview_answers_active"
  ON "user_interview_answers" ("user_id", "question_key")
  WHERE "deleted_at" IS NULL;