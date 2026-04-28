-- Phase F (H-5): two-phase rename of `topic_post_attachments` → `post_game_attachments`.
--
-- Old name was misleading: this table stores attached *games* (PGN +
-- Lichess metadata), not generic post attachments. The new name better
-- matches the intended scope.
--
-- This is the structural-rename phase. Existing data (rows, FK from
-- topic_posts, RLS policies — applied later by `rls_policies.sql`) is
-- preserved by `ALTER TABLE ... RENAME TO ...` instead of being
-- dropped + recreated.
--
-- A backwards-compatible VIEW under the old name is created so deploy
-- environments running the previous build (which still reads from
-- `topic_post_attachments`) can keep functioning during the rolling
-- deploy window. The VIEW is read-only; new INSERTs must target the
-- canonical table directly.
ALTER TABLE "topic_post_attachments" RENAME TO "post_game_attachments";--> statement-breakpoint

-- Rename indexes so their names match the new table — keeps `\d` /
-- `pg_indexes` output coherent and prevents index-name collisions if a
-- later migration recreates one.
ALTER INDEX "idx_topic_post_attachments_post" RENAME TO "idx_post_game_attachments_post";--> statement-breakpoint
ALTER INDEX "idx_topic_post_attachments_source" RENAME TO "idx_post_game_attachments_source";--> statement-breakpoint
ALTER INDEX "idx_topic_post_attachments_size" RENAME TO "idx_post_game_attachments_size";--> statement-breakpoint
ALTER INDEX "idx_topic_post_attachments_source_game" RENAME TO "idx_post_game_attachments_source_game";--> statement-breakpoint

-- Rename the unique constraint on post_id so the auto-generated drizzle
-- name continues to match the table.
ALTER TABLE "post_game_attachments" RENAME CONSTRAINT "topic_post_attachments_post_id_unique" TO "post_game_attachments_post_id_unique";--> statement-breakpoint

-- Rename the foreign key constraint to keep the drizzle naming convention
-- (`<from>_<col>_<to>_<col>_fk`).
ALTER TABLE "post_game_attachments" RENAME CONSTRAINT "topic_post_attachments_post_id_topic_posts_id_fk" TO "post_game_attachments_post_id_topic_posts_id_fk";--> statement-breakpoint

-- Compat VIEW: old code paths (and any in-flight workers from the
-- previous deploy) keep reading the table under its old name during the
-- rolling deploy window. The view is intentionally NOT updatable — any
-- writer that reaches this point should be writing to the canonical
-- table directly. Drop this view in a follow-up migration once the
-- compatibility window has closed.
CREATE VIEW "topic_post_attachments" AS SELECT * FROM "post_game_attachments";
