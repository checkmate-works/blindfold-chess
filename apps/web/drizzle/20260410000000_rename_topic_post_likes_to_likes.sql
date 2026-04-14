-- Rename topic_post_likes to likes and convert to a polymorphic structure.
--
-- Why a handwritten migration:
--   drizzle-kit's diff engine cannot reliably detect a rename coupled with a
--   column reshape (post_id → target_id + new target_type column). Left to
--   drizzle-kit generate, the result would be DROP + CREATE, which would lose
--   every existing like. This migration preserves data in place.
--
-- Strategy: rename the table, rename the column, add target_type defaulting
-- to 'topic_post' so existing rows back-fill cleanly, then drop the default
-- so future inserts must specify target_type explicitly.
--
-- All statements use IF EXISTS / IF NOT EXISTS guards where possible so that
-- the migration is safe to re-run against partially-migrated databases.

-- 1. Rename the table (topic_post_likes → likes).
ALTER TABLE IF EXISTS "topic_post_likes" RENAME TO "likes";
--> statement-breakpoint

-- 2. Add target_type column with a temporary default so existing rows fill in.
ALTER TABLE "likes"
  ADD COLUMN IF NOT EXISTS "target_type" varchar(50) NOT NULL DEFAULT 'topic_post';
--> statement-breakpoint

-- 3. Rename post_id → target_id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'likes' AND column_name = 'post_id'
  ) THEN
    ALTER TABLE "likes" RENAME COLUMN "post_id" TO "target_id";
  END IF;
END;
$$;
--> statement-breakpoint

-- 4. Drop the legacy FK to topic_posts (polymorphic target cannot have a FK).
ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "topic_post_likes_post_id_topic_posts_id_fk";
--> statement-breakpoint

-- 5. Drop the old UNIQUE constraint on (user_id, post_id).
ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "uq_topic_post_like";
--> statement-breakpoint

-- 6. Add the new UNIQUE constraint on (user_id, target_type, target_id).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_like'
  ) THEN
    ALTER TABLE "likes"
      ADD CONSTRAINT "uq_like" UNIQUE ("user_id", "target_type", "target_id");
  END IF;
END;
$$;
--> statement-breakpoint

-- 7. Drop the old indexes.
DROP INDEX IF EXISTS "idx_topic_post_likes_post";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_topic_post_likes_user";
--> statement-breakpoint

-- 8. Create the new polymorphic indexes.
CREATE INDEX IF NOT EXISTS "idx_likes_target" ON "likes" USING btree ("target_type", "target_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_likes_user" ON "likes" USING btree ("user_id");
--> statement-breakpoint

-- 9. Drop the temporary default on target_type so new inserts must be explicit.
ALTER TABLE "likes" ALTER COLUMN "target_type" DROP DEFAULT;
