-- Custom SQL migration file, put your code below! --

-- Assign post_image_attachments.display_order from the parent post's current
-- image count, server-side, inside the same BEFORE INSERT trigger that
-- enforces the per-post cap.
--
-- Why: the listing query orders by (post_id, display_order ASC), but every
-- row was inserted with the column DEFAULT 0. With all keys equal, Postgres
-- returns tied rows in an arbitrary, unstable order — so a post's images
-- appeared in a different sequence than they were uploaded, and could even
-- reorder between page loads.
--
-- The fix piggybacks on the count the trigger already reads under FOR UPDATE:
-- `current_count` is exactly the number of images already attached, i.e. the
-- 0-based position this new image should occupy. Setting NEW.display_order to
-- it (before the count is incremented) yields a stable 0,1,2 ordering that
-- matches the sequential upload order, race-free under the existing row lock.
-- The assignment is unconditional and authoritative: callers do not (and
-- should not) supply display_order — insertion order IS display order.
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

  -- Stable, server-authoritative ordering: the 0-based position of this
  -- image is the number of images already attached. Assigned before the
  -- increment below so the first image gets 0, the second 1, the third 2.
  NEW.display_order := current_count;

  UPDATE topic_posts
  SET image_attachment_count = image_attachment_count + 1
  WHERE id = NEW.post_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
