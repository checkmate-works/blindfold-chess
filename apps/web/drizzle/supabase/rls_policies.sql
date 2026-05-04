-- RLS Policies and Triggers
-- This file enables RLS and creates policies for tables that require
-- row-level security in Supabase environments.
--
-- This file is automatically applied by scripts/migrate.ts on Supabase environments.
-- It requires Supabase-managed roles (supabase_auth_admin, authenticated, anon)
-- and auth.uid() — it will fail on local PostgreSQL. This is intentional.
--
-- All statements are convergent-idempotent (safe to run multiple times).
-- Re-running will recreate policies and triggers to match the expected
-- definitions, correcting any configuration drift.

-- =============================================================================
-- user_roles
-- =============================================================================
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- profiles
-- =============================================================================
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON "profiles";
CREATE POLICY "profiles_select_policy" ON "profiles"
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "profiles_insert_policy" ON "profiles";
CREATE POLICY "profiles_insert_policy" ON "profiles"
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_policy" ON "profiles";
CREATE POLICY "profiles_update_policy" ON "profiles"
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON "profiles";
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON "profiles"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- likes
-- =============================================================================
ALTER TABLE "likes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_select" ON "likes";
CREATE POLICY "likes_select" ON "likes"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "likes_insert" ON "likes";
CREATE POLICY "likes_insert" ON "likes"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "likes_delete" ON "likes";
CREATE POLICY "likes_delete" ON "likes"
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- user_follows
-- =============================================================================
ALTER TABLE "user_follows" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_follows_select" ON "user_follows";
CREATE POLICY "user_follows_select" ON "user_follows"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_follows_insert" ON "user_follows";
CREATE POLICY "user_follows_insert" ON "user_follows"
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "user_follows_delete" ON "user_follows";
CREATE POLICY "user_follows_delete" ON "user_follows"
  FOR DELETE USING (auth.uid() = follower_id);

-- =============================================================================
-- user_blocks
-- =============================================================================
ALTER TABLE "user_blocks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_select" ON "user_blocks";
CREATE POLICY "user_blocks_select" ON "user_blocks"
  FOR SELECT USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks_insert" ON "user_blocks";
CREATE POLICY "user_blocks_insert" ON "user_blocks"
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks_delete" ON "user_blocks";
CREATE POLICY "user_blocks_delete" ON "user_blocks"
  FOR DELETE USING (auth.uid() = blocker_id);

-- =============================================================================
-- moderation_actions
-- =============================================================================
ALTER TABLE "moderation_actions" ENABLE ROW LEVEL SECURITY;

-- Only admins can read moderation actions (check user_roles)
DROP POLICY IF EXISTS "moderation_actions_select" ON "moderation_actions";
CREATE POLICY "moderation_actions_select" ON "moderation_actions"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can insert moderation actions
DROP POLICY IF EXISTS "moderation_actions_insert" ON "moderation_actions";
CREATE POLICY "moderation_actions_insert" ON "moderation_actions"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- =============================================================================
-- topic_posts
-- =============================================================================
ALTER TABLE "topic_posts" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "topic_posts_select" ON "topic_posts";
CREATE POLICY "topic_posts_select" ON "topic_posts"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "topic_posts_insert" ON "topic_posts";
CREATE POLICY "topic_posts_insert" ON "topic_posts"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "topic_posts_delete" ON "topic_posts";
CREATE POLICY "topic_posts_delete" ON "topic_posts"
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "topic_posts_update" ON "topic_posts";
CREATE POLICY "topic_posts_update" ON "topic_posts"
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- user_activity_log
-- =============================================================================
ALTER TABLE "user_activity_log" ENABLE ROW LEVEL SECURITY;

-- Only admins can read activity logs
DROP POLICY IF EXISTS "user_activity_log_select" ON "user_activity_log";
CREATE POLICY "user_activity_log_select" ON "user_activity_log"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Authenticated users can insert their own activity logs
DROP POLICY IF EXISTS "user_activity_log_insert" ON "user_activity_log";
CREATE POLICY "user_activity_log_insert" ON "user_activity_log"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- notifications
-- =============================================================================
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
DROP POLICY IF EXISTS "notifications_select" ON "notifications";
CREATE POLICY "notifications_select" ON "notifications"
  FOR SELECT USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
DROP POLICY IF EXISTS "notifications_update" ON "notifications";
CREATE POLICY "notifications_update" ON "notifications"
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "notifications_delete" ON "notifications";
CREATE POLICY "notifications_delete" ON "notifications"
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- chess_openings (master data — public read, service role only write)
-- =============================================================================
ALTER TABLE "chess_openings" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chess_openings_select" ON "chess_openings";
CREATE POLICY "chess_openings_select" ON "chess_openings"
  FOR SELECT USING (true);

-- =============================================================================
-- challenge_results
-- =============================================================================
ALTER TABLE "challenge_results" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenge_results_select" ON "challenge_results";
CREATE POLICY "challenge_results_select" ON "challenge_results"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "challenge_results_insert" ON "challenge_results";
CREATE POLICY "challenge_results_insert" ON "challenge_results"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- challenge_best_scores
-- =============================================================================
ALTER TABLE "challenge_best_scores" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenge_best_scores_select" ON "challenge_best_scores";
CREATE POLICY "challenge_best_scores_select" ON "challenge_best_scores"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "challenge_best_scores_insert" ON "challenge_best_scores";
CREATE POLICY "challenge_best_scores_insert" ON "challenge_best_scores"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "challenge_best_scores_update" ON "challenge_best_scores";
CREATE POLICY "challenge_best_scores_update" ON "challenge_best_scores"
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- article_images (admin-only write, public read)
-- =============================================================================
ALTER TABLE "article_images" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_images_select" ON "article_images";
CREATE POLICY "article_images_select" ON "article_images"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "article_images_insert_admin" ON "article_images";
CREATE POLICY "article_images_insert_admin" ON "article_images"
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'user_role') = 'admin'
  );

DROP POLICY IF EXISTS "article_images_delete_admin" ON "article_images";
CREATE POLICY "article_images_delete_admin" ON "article_images"
  FOR DELETE USING (
    (auth.jwt() ->> 'user_role') = 'admin'
  );

-- =============================================================================
-- feed_items (public timeline — public read, authenticated insert)
-- =============================================================================
ALTER TABLE "feed_items" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_items_select" ON "feed_items";
CREATE POLICY "feed_items_select" ON "feed_items"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "feed_items_insert" ON "feed_items";
CREATE POLICY "feed_items_insert" ON "feed_items"
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- =============================================================================
-- stripe_customers (server-side only writes, user can read own)
-- =============================================================================
ALTER TABLE "stripe_customers" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stripe_customers_select" ON "stripe_customers";
CREATE POLICY "stripe_customers_select" ON "stripe_customers"
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- subscriptions (server-side only writes, user can read own)
-- =============================================================================
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select" ON "subscriptions";
CREATE POLICY "subscriptions_select" ON "subscriptions"
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- user_interview_answers (public read, own insert/update)
-- =============================================================================
ALTER TABLE "user_interview_answers" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_interview_answers_select" ON "user_interview_answers";
CREATE POLICY "user_interview_answers_select" ON "user_interview_answers"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_interview_answers_insert" ON "user_interview_answers";
CREATE POLICY "user_interview_answers_insert" ON "user_interview_answers"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_interview_answers_delete" ON "user_interview_answers";

DROP POLICY IF EXISTS "user_interview_answers_update" ON "user_interview_answers";
CREATE POLICY "user_interview_answers_update" ON "user_interview_answers"
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- ranks (master data — read-only for all, write via service role only)
-- =============================================================================
ALTER TABLE "ranks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ranks_select_policy" ON "ranks";
CREATE POLICY "ranks_select_policy" ON "ranks"
  FOR SELECT USING (true);

-- =============================================================================
-- user_ranks (read-only for authenticated, write via service role only)
-- =============================================================================
ALTER TABLE "user_ranks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_ranks_select_policy" ON "user_ranks";
CREATE POLICY "user_ranks_select_policy" ON "user_ranks"
  FOR SELECT USING (true);

-- =============================================================================
-- achievements (master data — public read, service role only write)
-- =============================================================================
ALTER TABLE "achievements" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "achievements_select_policy" ON "achievements";
CREATE POLICY "achievements_select_policy" ON "achievements"
  FOR SELECT USING (true);

-- =============================================================================
-- user_achievements (immutable log — public read, service role only write)
-- =============================================================================
ALTER TABLE "user_achievements" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_achievements_select_policy" ON "user_achievements";
CREATE POLICY "user_achievements_select_policy" ON "user_achievements"
  FOR SELECT USING (true);

-- =============================================================================
-- exp_events (append-only Exp log — authenticated SELECT own rows, service role only write)
-- =============================================================================
ALTER TABLE "exp_events" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exp_events_select_policy" ON "exp_events";
CREATE POLICY "exp_events_select_policy" ON "exp_events"
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- user_exp (cumulative Exp cache — public read, service role only write)
-- =============================================================================
ALTER TABLE "user_exp" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_exp_select_policy" ON "user_exp";
CREATE POLICY "user_exp_select_policy" ON "user_exp"
  FOR SELECT USING (true);

-- =============================================================================
-- positions (UGC — public read for catalog, owner write, logical delete)
-- =============================================================================
-- Positions are user-submitted chess boards used across multiple practice
-- modules. SELECT is open (catalog listings filter `deleted_at IS NULL` at
-- the application layer). INSERT/UPDATE are restricted to the owner; UPDATE
-- also carries a WITH CHECK so the `user_id` cannot be reassigned to
-- another account during an edit. Physical DELETE is service-role only
-- (owners deprecate via `deleted_at`).
ALTER TABLE "positions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "positions_select" ON "positions";
CREATE POLICY "positions_select" ON "positions"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "positions_insert" ON "positions";
CREATE POLICY "positions_insert" ON "positions"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "positions_update" ON "positions";
CREATE POLICY "positions_update" ON "positions"
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- chunks (UGC public catalog — open read, owner write, logical delete)
-- =============================================================================
-- Chunks are user-submitted but function as a global public catalog: anyone
-- can SELECT, but only the creator may INSERT / UPDATE (which includes
-- logical delete via `deleted_at`). Physical DELETE is service-role only.
-- Filtering out soft-deleted rows is done at the application layer so that
-- admin tooling via the service role can still see them.
ALTER TABLE "chunks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chunks_select" ON "chunks";
CREATE POLICY "chunks_select" ON "chunks"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "chunks_insert" ON "chunks";
CREATE POLICY "chunks_insert" ON "chunks"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chunks_update" ON "chunks";
CREATE POLICY "chunks_update" ON "chunks"
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- position_chunks (junction — public read, position-owner write)
-- =============================================================================
-- INSERT/DELETE are gated on the POSITION owner, not the chunk owner. Chunk
-- creators have no veto over which positions reference their chunks.
ALTER TABLE "position_chunks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "position_chunks_select" ON "position_chunks";
CREATE POLICY "position_chunks_select" ON "position_chunks"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "position_chunks_insert" ON "position_chunks";
CREATE POLICY "position_chunks_insert" ON "position_chunks"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM positions p
      WHERE p.id = position_id
      AND p.user_id = auth.uid()
      AND p.deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM chunks c
      WHERE c.id = chunk_id
      AND c.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "position_chunks_delete" ON "position_chunks";
CREATE POLICY "position_chunks_delete" ON "position_chunks"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM positions p
      WHERE p.id = position_id
      AND p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- puzzle_solutions (public read, service role only write)
-- =============================================================================
ALTER TABLE "puzzle_solutions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "puzzle_solutions_select_policy" ON "puzzle_solutions";
CREATE POLICY "puzzle_solutions_select_policy" ON "puzzle_solutions"
  FOR SELECT USING (true);

-- =============================================================================
-- post_game_pgn_attachments (1:0..1 extension of topic_posts)
-- =============================================================================
-- Public read is gated on the parent post NOT being soft-deleted. The
-- application layer also filters `topic_posts.deleted_at IS NULL`, but
-- a direct PostgREST hit on this table by REST clients would otherwise
-- expose attachments belonging to soft-deleted posts. Two-layer defense.
ALTER TABLE "post_game_pgn_attachments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_game_pgn_attachments_select" ON "post_game_pgn_attachments";
CREATE POLICY "post_game_pgn_attachments_select" ON "post_game_pgn_attachments"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_game_pgn_attachments.post_id
        AND p.deleted_at IS NULL
    )
  );
-- Note: this policy is intentionally stricter than `topic_posts_select`
-- (which uses `USING (true)` and lets every row through, relying on
-- the application layer to filter `deleted_at IS NULL`). The deleted-post
-- check here is intentional defense-in-depth for attachment data: while
-- soft-deleted `topic_posts` rows themselves are filtered by application-
-- layer queries, an attached game (with full PGN, original player names,
-- and source URL) is markedly more sensitive than the post text and
-- warrants DB-level enforcement. Pushing the deleted-post check into
-- RLS prevents a future caller (debug tool, REST client, ad-hoc migration)
-- from accidentally re-exposing orphaned attachment rows that survive
-- a soft delete.

-- INSERT: only the parent post's author may attach a game, and only while the
-- post is not soft-deleted. The application path inserts the attachment in the
-- same transaction as the post (via createPostBase's afterInsert hook); this
-- policy is the secondary guard against direct REST writes.
DROP POLICY IF EXISTS "post_game_pgn_attachments_insert" ON "post_game_pgn_attachments";
CREATE POLICY "post_game_pgn_attachments_insert" ON "post_game_pgn_attachments"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_game_pgn_attachments.post_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- No UPDATE policy: attachments are immutable once created (mirrors the
-- "no edit on posts" rule from the comment system).

-- DELETE: post owner may delete their attachment. In practice the path is
-- "delete post → CASCADE attachment", but the explicit policy keeps the
-- direct delete path closed to non-owners.
-- Note: INSERT requires deleted_at IS NULL (cannot attach to a soft-deleted post).
-- The DELETE policy's own USING clause has no deleted_at guard, but Postgres
-- applies the SELECT policy to row-fetch during DELETE — so DELETE against a
-- soft-deleted post's attachment also reports 0 rows in practice. The typical
-- path is "delete post → CASCADE attachment", not direct attachment delete.
DROP POLICY IF EXISTS "post_game_pgn_attachments_delete" ON "post_game_pgn_attachments";
CREATE POLICY "post_game_pgn_attachments_delete" ON "post_game_pgn_attachments"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_game_pgn_attachments.post_id
        AND p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- post_game_embed_attachments (1:0..1 extension of topic_posts)
-- =============================================================================
ALTER TABLE "post_game_embed_attachments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_game_embed_attachments_select" ON "post_game_embed_attachments";
CREATE POLICY "post_game_embed_attachments_select" ON "post_game_embed_attachments"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_game_embed_attachments.post_id
        AND p.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "post_game_embed_attachments_insert" ON "post_game_embed_attachments";
CREATE POLICY "post_game_embed_attachments_insert" ON "post_game_embed_attachments"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_game_embed_attachments.post_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- No UPDATE policy: embed attachments are immutable once created.

DROP POLICY IF EXISTS "post_game_embed_attachments_delete" ON "post_game_embed_attachments";
CREATE POLICY "post_game_embed_attachments_delete" ON "post_game_embed_attachments"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_game_embed_attachments.post_id
        AND p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- post_image_attachments (N:1 image attachments on topic_posts, max 3 per post)
-- =============================================================================
-- Mirrors the posture of post_game_pgn_attachments / post_game_embed_attachments:
-- defense-in-depth select gated on parent post NOT being soft-deleted, INSERT
-- restricted to the parent post's owner (and the storage_path's first folder
-- must match auth.uid() — last-line-of-defense against a request that smuggled
-- in a path pointing at another user's folder), DELETE restricted to the
-- parent post's owner. No UPDATE policy — attachments are immutable once
-- created.
ALTER TABLE "post_image_attachments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_image_attachments_select" ON "post_image_attachments";
CREATE POLICY "post_image_attachments_select" ON "post_image_attachments"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_image_attachments.post_id
        AND p.deleted_at IS NULL
    )
  );

-- INSERT: owner of the parent post (which must not be soft-deleted) AND
-- storage_path's first folder segment must match the calling user's id.
-- The application handler is responsible for building the storage_path
-- correctly; this policy is the secondary guard against a direct REST
-- write that submits a storage_path pointing at someone else's folder.
DROP POLICY IF EXISTS "post_image_attachments_insert" ON "post_image_attachments";
CREATE POLICY "post_image_attachments_insert" ON "post_image_attachments"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_image_attachments.post_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
    AND split_part(post_image_attachments.storage_path, '/', 1) = auth.uid()::text
  );

-- No UPDATE policy: image attachments are immutable once created.

DROP POLICY IF EXISTS "post_image_attachments_delete" ON "post_image_attachments";
CREATE POLICY "post_image_attachments_delete" ON "post_image_attachments"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_image_attachments.post_id
        AND p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- post_fen_attachments (1:0..1 FEN attachment per topic_post)
-- =============================================================================
-- Mirrors the posture of post_game_pgn_attachments / post_game_embed_attachments:
-- defense-in-depth select gated on parent post NOT being soft-deleted, INSERT
-- restricted to the parent post's owner, DELETE restricted to the parent
-- post's owner. No UPDATE policy — attachments are immutable once created.
-- The 1:0..1 invariant is enforced at the DB by the UNIQUE constraint on
-- post_id (set in the migration), not in policy.
ALTER TABLE "post_fen_attachments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_fen_attachments_select" ON "post_fen_attachments";
CREATE POLICY "post_fen_attachments_select" ON "post_fen_attachments"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_fen_attachments.post_id
        AND p.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "post_fen_attachments_insert" ON "post_fen_attachments";
CREATE POLICY "post_fen_attachments_insert" ON "post_fen_attachments"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_fen_attachments.post_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- No UPDATE policy: FEN attachments are immutable once created.

DROP POLICY IF EXISTS "post_fen_attachments_delete" ON "post_fen_attachments";
CREATE POLICY "post_fen_attachments_delete" ON "post_fen_attachments"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_fen_attachments.post_id
        AND p.user_id = auth.uid()
    )
  );
