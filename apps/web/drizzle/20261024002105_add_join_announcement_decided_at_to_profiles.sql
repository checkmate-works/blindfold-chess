ALTER TABLE "profiles" ADD COLUMN "join_announcement_decided_at" timestamp with time zone;--> statement-breakpoint
-- Existing members count as already decided: the arrival announcement is only
-- offered to people who sign up after this column exists.
UPDATE "profiles" SET "join_announcement_decided_at" = now() WHERE "join_announcement_decided_at" IS NULL;
