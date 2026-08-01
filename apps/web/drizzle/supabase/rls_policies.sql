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
ALTER TABLE "user_roles" FORCE ROW LEVEL SECURITY;

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
-- notification_mutes
-- =============================================================================
ALTER TABLE "notification_mutes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_mutes_select" ON "notification_mutes";
CREATE POLICY "notification_mutes_select" ON "notification_mutes"
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_mutes_insert" ON "notification_mutes";
CREATE POLICY "notification_mutes_insert" ON "notification_mutes"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_mutes_delete" ON "notification_mutes";
CREATE POLICY "notification_mutes_delete" ON "notification_mutes"
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
-- chunk_edit_requests (Qiita-style suggestions on a draft chunk)
-- =============================================================================
-- SELECT is open so the discussion is visible to anyone (the owner reviews
-- on the chunk page, and other users can see what's already been proposed).
-- INSERT is restricted to the proposer and is additionally gated at the
-- application layer (rate limit, draft-only check, non-owner check); the
-- WITH CHECK below is the structural backstop. UPDATE is granted to either
-- the proposer (so they can withdraw) or the chunk owner (so they can
-- accept / reject) — the application layer enforces the per-transition
-- preconditions (pending only, idempotence on terminal states).
ALTER TABLE "chunk_edit_requests" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chunk_edit_requests_select" ON "chunk_edit_requests";
CREATE POLICY "chunk_edit_requests_select" ON "chunk_edit_requests"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "chunk_edit_requests_insert" ON "chunk_edit_requests";
CREATE POLICY "chunk_edit_requests_insert" ON "chunk_edit_requests"
  FOR INSERT WITH CHECK (
    auth.uid() = proposer_id
    AND EXISTS (
      SELECT 1 FROM chunks c
      WHERE c.id = chunk_id
        AND c.deleted_at IS NULL
        AND c.status = 'draft'
        AND c.user_id IS NOT NULL
        AND c.user_id != auth.uid()
    )
  );

DROP POLICY IF EXISTS "chunk_edit_requests_update" ON "chunk_edit_requests";
CREATE POLICY "chunk_edit_requests_update" ON "chunk_edit_requests"
  FOR UPDATE
  USING (
    auth.uid() = proposer_id
    OR EXISTS (
      SELECT 1 FROM chunks c
      WHERE c.id = chunk_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = proposer_id
    OR EXISTS (
      SELECT 1 FROM chunks c
      WHERE c.id = chunk_id AND c.user_id = auth.uid()
    )
  );

-- =============================================================================
-- position_edit_requests (Qiita-style tag-link suggestions on a position)
-- =============================================================================
-- SELECT is open so anyone can see what's already been proposed. INSERT is
-- restricted to the proposer (non-owner, against a non-deleted position) and
-- additionally gated at the application layer (rate limit, one-pending check,
-- and validation that the proposed themes are is_theme = true and the proposed
-- chunks are published / non-deleted — neither of which can be expressed in a
-- CHECK over a jsonb array). UPDATE is granted
-- to either the proposer (withdraw) or the position owner (accept / reject);
-- the application layer enforces the per-transition preconditions. Unlike
-- chunk_edit_requests there is no `status = 'draft'` gate (positions have no
-- status column) and no `user_id IS NOT NULL` guard (positions.user_id is
-- NOT NULL).
ALTER TABLE "position_edit_requests" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "position_edit_requests_select" ON "position_edit_requests";
CREATE POLICY "position_edit_requests_select" ON "position_edit_requests"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "position_edit_requests_insert" ON "position_edit_requests";
CREATE POLICY "position_edit_requests_insert" ON "position_edit_requests"
  FOR INSERT WITH CHECK (
    auth.uid() = proposer_id
    AND EXISTS (
      SELECT 1 FROM positions p
      WHERE p.id = position_id
        AND p.deleted_at IS NULL
        AND p.user_id != auth.uid()
    )
  );

DROP POLICY IF EXISTS "position_edit_requests_update" ON "position_edit_requests";
CREATE POLICY "position_edit_requests_update" ON "position_edit_requests"
  FOR UPDATE
  USING (
    auth.uid() = proposer_id
    OR EXISTS (
      SELECT 1 FROM positions p
      WHERE p.id = position_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = proposer_id
    OR EXISTS (
      SELECT 1 FROM positions p
      WHERE p.id = position_id AND p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- position_content_revisions (append-only edit-history trail; read-only for all, write via the app's own server-side mutation path only)
-- =============================================================================
ALTER TABLE "position_content_revisions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "position_content_revisions_select" ON "position_content_revisions";
CREATE POLICY "position_content_revisions_select" ON "position_content_revisions"
  FOR SELECT USING (true);

-- =============================================================================
-- chunk_feedback_topics (author-flagged "I want feedback on these fields")
-- =============================================================================
-- SELECT is open so visitors can see which fields the author is workshopping
-- (the detail-page callout and the suggestion form both read this). Writes
-- are restricted to the chunk owner; the application layer additionally
-- limits writes to drafts and resets the row set on every chunk save. The
-- WITH CHECK below is the structural backstop against direct API misuse.
ALTER TABLE "chunk_feedback_topics" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chunk_feedback_topics_select" ON "chunk_feedback_topics";
CREATE POLICY "chunk_feedback_topics_select" ON "chunk_feedback_topics"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "chunk_feedback_topics_insert" ON "chunk_feedback_topics";
CREATE POLICY "chunk_feedback_topics_insert" ON "chunk_feedback_topics"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chunks c
      WHERE c.id = chunk_id
        AND c.user_id = auth.uid()
        AND c.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "chunk_feedback_topics_delete" ON "chunk_feedback_topics";
CREATE POLICY "chunk_feedback_topics_delete" ON "chunk_feedback_topics"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM chunks c
      WHERE c.id = chunk_id AND c.user_id = auth.uid()
    )
  );

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
-- position_themes (junction — public read, position-owner write)
-- =============================================================================
-- Mirrors `position_chunks`: INSERT/DELETE are gated on the POSITION owner.
-- The INSERT path additionally requires `glossary_terms.is_theme = true` so
-- non-theme glossary entries (Calculation, Flank, Algebraic notation, etc.)
-- cannot be attached as theme tags even by a direct REST write.
ALTER TABLE "position_themes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "position_themes_select" ON "position_themes";
CREATE POLICY "position_themes_select" ON "position_themes"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "position_themes_insert" ON "position_themes";
CREATE POLICY "position_themes_insert" ON "position_themes"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM positions p
      WHERE p.id = position_id
      AND p.user_id = auth.uid()
      AND p.deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM glossary_terms gt
      WHERE gt.id = term_id
      AND gt.is_theme = true
    )
  );

DROP POLICY IF EXISTS "position_themes_delete" ON "position_themes";
CREATE POLICY "position_themes_delete" ON "position_themes"
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
-- featured_puzzles (admin-curated Daily Puzzle pool; deny-by-default)
-- =============================================================================
-- No policies and no grants: all reads/writes go through server-side Drizzle
-- (BYPASSRLS role). Deny-by-default is load-bearing here, not just posture —
-- `positions` has an owner-writable UPDATE policy, so pool membership must
-- live where the puzzle's author cannot reach it via PostgREST, or authors
-- could feature their own puzzles.
ALTER TABLE "featured_puzzles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "featured_puzzles" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- user_grants (admin-only write, server-side only read; deny-by-default)
-- =============================================================================
ALTER TABLE "user_grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_grants" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- announcements (admin-only write; deny-by-default)
-- =============================================================================
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "announcements" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- ad_creatives (admin-only write; deny-by-default)
-- =============================================================================
-- Reads go through server-side Drizzle (BYPASSRLS role), same posture as
-- articles/positions, so no SELECT policy is defined for anon/authenticated.
ALTER TABLE "ad_creatives" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ad_creatives" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- articles (admin-only write; deny-by-default)
-- =============================================================================
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "articles" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- positions (admin-only write; deny-by-default)
-- =============================================================================
ALTER TABLE "positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "positions" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- chunks (UGC public catalog — open read, owner write; FORCE RLS)
-- =============================================================================
-- Belt-and-suspenders pair on top of the per-action policies defined above
-- (chunks_select / chunks_insert / chunks_update). FORCE makes owners and
-- superusers also obey RLS when they connect via the standard pooler — only
-- BYPASSRLS roles (service_role, supabase_admin) can write outside the
-- per-action policies. Mirrors the `positions` deny-by-default entry.
ALTER TABLE "chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chunks" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- position_chunks (UGC junction — open read, position-owner write; FORCE RLS)
-- =============================================================================
-- Mirrors the chunks entry. The per-action policies
-- (position_chunks_select / position_chunks_insert / position_chunks_delete)
-- are defined above; this block adds FORCE so even table owners obey them.
ALTER TABLE "position_chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "position_chunks" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- topic_post_ratings (server-side only writes; deny-by-default)
-- =============================================================================
ALTER TABLE "topic_post_ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "topic_post_ratings" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- rate_limit_events (server-side only writes; deny-by-default)
-- =============================================================================
ALTER TABLE "rate_limit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limit_events" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- rate_limit_key_events (server-side only writes; deny-by-default)
-- =============================================================================
ALTER TABLE "rate_limit_key_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limit_key_events" FORCE ROW LEVEL SECURITY;

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

-- =============================================================================
-- post_video_attachments (1:0..1 video attachment per topic_post)
-- =============================================================================
-- Mirrors the posture of post_fen_attachments: defense-in-depth select gated
-- on parent post NOT being soft-deleted, INSERT restricted to the parent
-- post's owner, DELETE restricted to the parent post's owner. No UPDATE
-- policy — attachments are immutable once created. The 1:0..1 invariant is
-- enforced at the DB by the UNIQUE constraint on post_id (set in the
-- migration), not in policy.
ALTER TABLE "post_video_attachments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_video_attachments_select" ON "post_video_attachments";
CREATE POLICY "post_video_attachments_select" ON "post_video_attachments"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_video_attachments.post_id
        AND p.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "post_video_attachments_insert" ON "post_video_attachments";
CREATE POLICY "post_video_attachments_insert" ON "post_video_attachments"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_video_attachments.post_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- No UPDATE policy: video attachments are immutable once created.

DROP POLICY IF EXISTS "post_video_attachments_delete" ON "post_video_attachments";
CREATE POLICY "post_video_attachments_delete" ON "post_video_attachments"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM topic_posts p
      WHERE p.id = post_video_attachments.post_id
        AND p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- point_events (append-only point ledger — authenticated SELECT own rows, service role only write)
-- =============================================================================
-- Mirrors the exp_events pattern. Writes are restricted to the service role
-- (point grants/consumption flow through server-side logic that holds the
-- service role key). Users may read their own history for display.
ALTER TABLE "point_events" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_events_select_policy" ON "point_events";
CREATE POLICY "point_events_select_policy" ON "point_events"
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- user_point_balances (materialized point balance cache — authenticated SELECT own rows, service role only write)
-- =============================================================================
-- Unlike user_exp (which is public for leaderboards), point balances are
-- per-user financial state and SHOULD NOT be visible to other users.
ALTER TABLE "user_point_balances" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_point_balances_select_policy" ON "user_point_balances";
CREATE POLICY "user_point_balances_select_policy" ON "user_point_balances"
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- point_batch_watermarks (internal batch progress — service role only)
-- =============================================================================
-- No SELECT policy: this table is internal bookkeeping. The service role
-- bypasses RLS, so leaving RLS enabled with no policies effectively makes it
-- inaccessible to authenticated/anon clients.
ALTER TABLE "point_batch_watermarks" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- point_redemptions (user redemption history — authenticated SELECT own rows, service role only write)
-- =============================================================================
ALTER TABLE "point_redemptions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_redemptions_select_policy" ON "point_redemptions";
CREATE POLICY "point_redemptions_select_policy" ON "point_redemptions"
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- point_purchases (user purchase history — authenticated SELECT own rows, service role only write)
-- =============================================================================
ALTER TABLE "point_purchases" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_purchases_select_policy" ON "point_purchases";
CREATE POLICY "point_purchases_select_policy" ON "point_purchases"
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- games (shared blindfold games — public catalog, service-role write)
-- =============================================================================
-- Anyone may read only VISIBLE rows: status = 'public' and not soft-deleted.
-- The planned owner-only `private` tier and soft-deleted rows are excluded from
-- anon/authenticated access (a future owner-scoped path will serve `private` to
-- its owner). The privileged application connection (Drizzle) and the service
-- role bypass RLS, so admin tooling and the publish/mutation actions still see
-- everything. No write policies: all mutations go through service-role actions.
ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "games_select" ON "games";
CREATE POLICY "games_select" ON "games"
  FOR SELECT USING (deleted_at IS NULL AND status = 'public');

-- =============================================================================
-- game_tokens (capability secret — service-role only)
-- =============================================================================
-- RLS enabled with NO policies: authenticated/anon cannot read the token hash
-- at all. Only the service role (which bypasses RLS) touches this table.
ALTER TABLE "game_tokens" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- game_comments (third-party advice — public read, service-role write)
-- =============================================================================
-- A comment is anon-visible only when it is not soft-deleted AND its parent
-- game is itself visible (public, not soft-deleted) — so a comment never leaks
-- the content of a hidden/private/deleted game. The app reads via Drizzle
-- (service role, bypasses RLS); this is defense-in-depth for the anon API.
ALTER TABLE "game_comments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_comments_select" ON "game_comments";
CREATE POLICY "game_comments_select" ON "game_comments"
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_comments.game_id
        AND g.deleted_at IS NULL
        AND g.status = 'public'
    )
  );

-- =============================================================================
-- game_chunks (community chunk links — public read, service-role write)
-- =============================================================================
-- Same parent-visibility gate as comments: a chunk link is only exposed while
-- its parent game is publicly visible.
ALTER TABLE "game_chunks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_chunks_select" ON "game_chunks";
CREATE POLICY "game_chunks_select" ON "game_chunks"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_chunks.game_id
        AND g.deleted_at IS NULL
        AND g.status = 'public'
    )
  );

-- =============================================================================
-- repertoires (型 — UGC course) + lines + opening links
-- =============================================================================
-- Visibility mirrors games: a repertoire is readable when it is live and shared
-- (public) OR when the requester is its owner — so an owner sees their own
-- private courses and anyone may see published ones (forward-ready; nothing is
-- public yet). Its lines and opening-links inherit that visibility. All writes
-- go through service-role server actions (which bypass RLS); these policies are
-- defense-in-depth for direct API access (read-only — no write grant exists).
ALTER TABLE "repertoires" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repertoires_select" ON "repertoires";
CREATE POLICY "repertoires_select" ON "repertoires"
  FOR SELECT USING (
    deleted_at IS NULL AND (status = 'public' OR auth.uid() = user_id)
  );

-- A line is visible iff its parent repertoire is visible and the line itself is
-- not soft-deleted.
ALTER TABLE "repertoire_lines" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repertoire_lines_select" ON "repertoire_lines";
CREATE POLICY "repertoire_lines_select" ON "repertoire_lines"
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.repertoires r
      WHERE r.id = repertoire_lines.repertoire_id
        AND r.deleted_at IS NULL
        AND (r.status = 'public' OR auth.uid() = r.user_id)
    )
  );

-- An opening link is visible iff its parent repertoire is visible.
ALTER TABLE "repertoire_openings" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repertoire_openings_select" ON "repertoire_openings";
CREATE POLICY "repertoire_openings_select" ON "repertoire_openings"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.repertoires r
      WHERE r.id = repertoire_openings.repertoire_id
        AND r.deleted_at IS NULL
        AND (r.status = 'public' OR auth.uid() = r.user_id)
    )
  );

-- Chapters / annotations are content: visible iff the parent repertoire is.
ALTER TABLE "repertoire_chapters" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repertoire_chapters_select" ON "repertoire_chapters";
CREATE POLICY "repertoire_chapters_select" ON "repertoire_chapters"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.repertoires r
      WHERE r.id = repertoire_chapters.repertoire_id
        AND r.deleted_at IS NULL
        AND (r.status = 'public' OR auth.uid() = r.user_id)
    )
  );

ALTER TABLE "repertoire_annotations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repertoire_annotations_select" ON "repertoire_annotations";
CREATE POLICY "repertoire_annotations_select" ON "repertoire_annotations"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.repertoires r
      WHERE r.id = repertoire_annotations.repertoire_id
        AND r.deleted_at IS NULL
        AND (r.status = 'public' OR auth.uid() = r.user_id)
    )
  );

-- =============================================================================
-- repertoire_chunks (community chunk links on a repertoire position — read
-- gated by parent visibility, service-role write)
-- =============================================================================
-- Same parent-visibility gate as the repertoires table itself: public parent
-- or owner. followers_only is NOT opened here — fail-closed for direct API
-- reads, matching the parent's own policy (app reads go through service role).
ALTER TABLE "repertoire_chunks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repertoire_chunks_select" ON "repertoire_chunks";
CREATE POLICY "repertoire_chunks_select" ON "repertoire_chunks"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.repertoires r
      WHERE r.id = repertoire_chunks.repertoire_id
        AND r.deleted_at IS NULL
        AND (r.status = 'public' OR auth.uid() = r.user_id)
    )
  );

-- Reviews / deviations are per-user private learning state: owner-only, no
-- public/anon read even when the repertoire itself is public.
ALTER TABLE "repertoire_reviews" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repertoire_reviews_select" ON "repertoire_reviews";
CREATE POLICY "repertoire_reviews_select" ON "repertoire_reviews"
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE "repertoire_deviations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repertoire_deviations_select" ON "repertoire_deviations";
CREATE POLICY "repertoire_deviations_select" ON "repertoire_deviations"
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- Reference / taxonomy master data (public read, service-role-only write)
-- =============================================================================
-- These tables hold app-managed reference data: the glossary, the article
-- taxonomy, and the tag vocabulary. They are seeded/edited exclusively through
-- the privileged Drizzle connection (BYPASSRLS) and the admin glossary tooling
-- (service role) — never through the anon/authenticated Supabase client.
--
-- WHY THIS BLOCK EXISTS: in Supabase the `public` schema's default privileges
-- grant ALL (arwdDxtm) to `anon` and `authenticated` on every table created by
-- the `postgres` role. A table that is NOT enrolled in RLS is therefore fully
-- readable AND writable (INSERT/UPDATE/DELETE/TRUNCATE) by anyone holding the
-- public anon key — which ships in the client bundle. These eleven tables were
-- missing from this file, so they were silently exposed for anonymous writes.
--
-- Enabling RLS with a single permissive SELECT policy (and no write policy)
-- closes that hole: anon/authenticated may read but cannot write, while the
-- `postgres` owner and `service_role` (both BYPASSRLS) keep full write access
-- for seeds and admin edits. This mirrors the existing master-data posture of
-- `chess_openings` / `ranks` / `achievements` (RLS on, not FORCEd, public
-- SELECT). FORCE is intentionally omitted so the BYPASSRLS owner connection
-- used by Drizzle seeds is never affected.

-- glossary_terms + related (glossary is public content rendered on /glossary)
ALTER TABLE "glossary_terms" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "glossary_terms_select" ON "glossary_terms";
CREATE POLICY "glossary_terms_select" ON "glossary_terms"
  FOR SELECT USING (true);

ALTER TABLE "glossary_term_translations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "glossary_term_translations_select" ON "glossary_term_translations";
CREATE POLICY "glossary_term_translations_select" ON "glossary_term_translations"
  FOR SELECT USING (true);

ALTER TABLE "glossary_term_aliases" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "glossary_term_aliases_select" ON "glossary_term_aliases";
CREATE POLICY "glossary_term_aliases_select" ON "glossary_term_aliases"
  FOR SELECT USING (true);

ALTER TABLE "glossary_term_positions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "glossary_term_positions_select" ON "glossary_term_positions";
CREATE POLICY "glossary_term_positions_select" ON "glossary_term_positions"
  FOR SELECT USING (true);

ALTER TABLE "glossary_term_relations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "glossary_term_relations_select" ON "glossary_term_relations";
CREATE POLICY "glossary_term_relations_select" ON "glossary_term_relations"
  FOR SELECT USING (true);

-- article taxonomy (categories / tags / practice-module links — public listings)
ALTER TABLE "article_categories" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "article_categories_select" ON "article_categories";
CREATE POLICY "article_categories_select" ON "article_categories"
  FOR SELECT USING (true);

ALTER TABLE "article_category_translations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "article_category_translations_select" ON "article_category_translations";
CREATE POLICY "article_category_translations_select" ON "article_category_translations"
  FOR SELECT USING (true);

ALTER TABLE "article_tags" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "article_tags_select" ON "article_tags";
CREATE POLICY "article_tags_select" ON "article_tags"
  FOR SELECT USING (true);

ALTER TABLE "article_practice_modules" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "article_practice_modules_select" ON "article_practice_modules";
CREATE POLICY "article_practice_modules_select" ON "article_practice_modules"
  FOR SELECT USING (true);

-- tag vocabulary (public catalog filtering)
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tags_select" ON "tags";
CREATE POLICY "tags_select" ON "tags"
  FOR SELECT USING (true);

ALTER TABLE "position_tags" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "position_tags_select" ON "position_tags";
CREATE POLICY "position_tags_select" ON "position_tags"
  FOR SELECT USING (true);
