-- Add parent_slug column to chess_openings.
--
-- Why "ensure" instead of "add":
-- The original migration for this column (20260320055526_add_parent_slug_to_chess_openings)
-- was generated on a separate branch. When merged, its `when` timestamp (1773986126878)
-- ended up older than an already-applied migration's `created_at` (1774000000000).
-- Drizzle's migrator only applies migrations where `when` > max(created_at), so the
-- original migration was permanently skipped on production. That migration has since
-- been removed, and this file serves as its replacement.
-- IF NOT EXISTS guards are used so this is safe on both fresh and existing databases.

ALTER TABLE "chess_openings" ADD COLUMN IF NOT EXISTS "parent_slug" varchar(100);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chess_openings_parent_slug" ON "chess_openings" USING btree ("parent_slug");
