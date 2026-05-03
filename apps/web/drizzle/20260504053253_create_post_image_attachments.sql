-- post_image_attachments — N:1 (max 3) image attachments per topic_post.
--
-- Sibling of post_game_pgn_attachments and post_game_embed_attachments
-- (Pattern 5 per-kind tables; see docs/design/SPEC1-embed-data-model-ADR.md).
-- This is the image kind of the post_<kind>_attachments family. Naming uses
-- post_image_ rather than post_game_image_ because images are not games and
-- never carry chess-specific attribution.
--
-- The companion `topic_posts.image_attachment_count` column + BEFORE INSERT
-- trigger enforces the per-post limit (MAX_IMAGES_PER_POST = 3) under
-- concurrent INSERT pressure. The trigger uses SELECT ... FOR UPDATE on the
-- parent row so two simultaneous attachment INSERTs cannot both observe
-- count = 2 and both succeed.

CREATE TABLE "post_image_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  -- Storage path under the `post-images` bucket. Format pinned by CHECK to
  -- `${userId}/${postId}/${randomUuid}.${ext}` so a direct REST write cannot
  -- escape the user folder, escape the post folder, or pick a synthetic
  -- filename. The renderer rebuilds the public URL from this column at read
  -- time — the `public_url` column is intentionally absent.
  "storage_path" varchar(1024) NOT NULL,
  "content_type" varchar(50) NOT NULL,
  "file_size" integer NOT NULL,
  "width" integer NOT NULL,
  "height" integer NOT NULL,
  "alt_text" varchar(255),
  "display_order" smallint NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  -- Allow-list of accepted MIME types. SVG is intentionally excluded
  -- (XSS / script-injection vector); the API handler also rejects SVG
  -- before reaching this CHECK.
  CONSTRAINT "post_image_attachments_chk_content_type"
    CHECK ("content_type" IN ('image/jpeg', 'image/png', 'image/webp')),
  -- Per-image cap: 2 MB. Storage bucket file_size_limit applies the same
  -- cap at the upload layer; this CHECK is the DB-level last-line-of-defense.
  CONSTRAINT "post_image_attachments_chk_file_size"
    CHECK ("file_size" > 0 AND "file_size" <= 2097152),
  CONSTRAINT "post_image_attachments_chk_dimensions_positive"
    CHECK ("width" > 0 AND "height" > 0),
  -- 50 megapixel cap: protects the renderer (and any future server-side
  -- decode) from decompression bombs. 50 MP comfortably exceeds reasonable
  -- camera output (a 12 MP smartphone JPEG is well under this) while
  -- rejecting pathological inputs.
  CONSTRAINT "post_image_attachments_chk_megapixels"
    CHECK ("width" * "height" <= 50000000),
  -- Pin storage_path to the canonical layout. Mirrors the regex used by
  -- the upload handler so a direct REST write cannot bypass it.
  --   ${userId-uuid}/${postId-uuid}/${random-uuid}.(jpg|png|webp)
  -- Each segment is the canonical 8-4-4-4-12 UUID layout (defense in
  -- depth — a 36-char string of hex+dash in the wrong shape must not
  -- pass).
  CONSTRAINT "post_image_attachments_chk_storage_path_format"
    CHECK (
      "storage_path" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
);
--> statement-breakpoint

ALTER TABLE "post_image_attachments"
  ADD CONSTRAINT "post_image_attachments_post_id_topic_posts_id_fk"
  FOREIGN KEY ("post_id") REFERENCES "public"."topic_posts"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "idx_post_image_attachments_post"
  ON "post_image_attachments" USING btree ("post_id");
--> statement-breakpoint

-- Composite index for ordered fetch ("images for post X in display order").
-- The listing query (`SELECT ... WHERE post_id = ? ORDER BY display_order`)
-- becomes an index-only scan with this composite covering both the predicate
-- and the sort.
CREATE INDEX "idx_post_image_attachments_post_order"
  ON "post_image_attachments" USING btree ("post_id", "display_order");
--> statement-breakpoint

-- Per-post counter on topic_posts. Maintained by the BEFORE INSERT /
-- AFTER DELETE triggers below. Used both for the cap CHECK in the trigger
-- and as a list/short-circuit hint for callers that just want to know
-- "does this post have images?" without a JOIN.
ALTER TABLE "topic_posts"
  ADD COLUMN "image_attachment_count" smallint NOT NULL DEFAULT 0;
--> statement-breakpoint

-- BEFORE INSERT trigger — race-free per-post limit enforcement.
--
-- The constant MAX_IMAGES_PER_POST = 3 is hardcoded in the trigger source.
-- To change it: edit this function, ship a new migration that does
-- CREATE OR REPLACE FUNCTION public.enforce_post_image_count_limit() with
-- the new constant. The trigger itself does not need to be re-bound.
CREATE OR REPLACE FUNCTION public.enforce_post_image_count_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count smallint;
  max_images CONSTANT smallint := 3;
BEGIN
  -- Lock the parent row so concurrent INSERTs into post_image_attachments
  -- cannot both pass the count check. The lock is released at transaction
  -- end (commit/rollback). Without FOR UPDATE, two transactions that each
  -- read count=2 would both increment to 3, violating the cap.
  SELECT image_attachment_count INTO current_count
  FROM topic_posts
  WHERE id = NEW.post_id
  FOR UPDATE;

  IF current_count IS NULL THEN
    -- Parent post does not exist. The FK on post_id would normally
    -- catch this AFTER the BEFORE INSERT triggers run, but if a future
    -- migration ever marks the FK as DEFERRABLE INITIALLY DEFERRED, the
    -- FK check would slide to commit time and the count update below
    -- could RACE against the missing parent. Raise explicitly here so
    -- the rejection is local to this trigger and the message is
    -- actionable in logs.
    RAISE EXCEPTION 'parent_post_missing'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF current_count >= max_images THEN
    RAISE EXCEPTION 'post_image_count_exceeded'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE topic_posts
  SET image_attachment_count = image_attachment_count + 1
  WHERE id = NEW.post_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS post_image_attachments_enforce_count
  ON post_image_attachments;
--> statement-breakpoint
CREATE TRIGGER post_image_attachments_enforce_count
  BEFORE INSERT ON post_image_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_post_image_count_limit();
--> statement-breakpoint

-- AFTER DELETE trigger — decrement the per-post counter.
CREATE OR REPLACE FUNCTION public.decrement_post_image_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE topic_posts
  SET image_attachment_count = GREATEST(image_attachment_count - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS post_image_attachments_decrement_count
  ON post_image_attachments;
--> statement-breakpoint
CREATE TRIGGER post_image_attachments_decrement_count
  AFTER DELETE ON post_image_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_post_image_count();
