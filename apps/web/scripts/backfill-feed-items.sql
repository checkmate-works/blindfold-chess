-- Backfill feed_items from existing topic_posts
--
-- Purpose:
--   Populates feed_items for top-level topic posts that were created before
--   the feed_items table was introduced. This ensures older posts appear in
--   the timeline alongside newer posts that are inserted via createPostBase.
--
-- Prerequisites:
--   - The feed_items table must already exist (migration 20260322224044)
--   - The topic_posts table must contain data
--
-- How to run:
--   Execute this script manually in the Supabase SQL Editor (Studio > SQL Editor).
--   It is idempotent — running it multiple times will not create duplicates.
--
-- Scope:
--   - Only top-level posts (parent_id IS NULL, deleted_at IS NULL)
--   - entity_type: 'topic_post'
--   - metadata format matches createPostBase: {"topicType": ..., "topicKey": ...}
--   - created_at is copied from topic_posts to preserve chronological order
--   - Out of scope: challenge_rank_update backfill

INSERT INTO feed_items (entity_type, entity_id, actor_id, metadata, created_at)
SELECT
  'topic_post',
  tp.id,
  tp.user_id,
  jsonb_build_object('topicType', tp.topic_type, 'topicKey', tp.topic_key),
  tp.created_at
FROM topic_posts tp
WHERE tp.parent_id IS NULL
  AND tp.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM feed_items fi
    WHERE fi.entity_type = 'topic_post'
      AND fi.entity_id = tp.id
  );
