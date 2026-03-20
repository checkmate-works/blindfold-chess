-- Remediation: ensure parent_slug column exists on chess_openings.
-- The original migration (20260320055526_add_parent_slug_to_chess_openings)
-- is permanently skipped on production because its `when` timestamp
-- (1773986126878) is older than the last applied migration's `created_at`
-- (1774000000000). Drizzle's migrator only applies migrations with
-- `when` > max(created_at), so out-of-order timestamps from concurrent
-- branch merges cause this issue.

ALTER TABLE "chess_openings" ADD COLUMN IF NOT EXISTS "parent_slug" varchar(100);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chess_openings_parent_slug" ON "chess_openings" USING btree ("parent_slug");
