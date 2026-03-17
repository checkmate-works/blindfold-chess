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
-- practice_sessions
-- =============================================================================
ALTER TABLE "practice_sessions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_sessions_select" ON "practice_sessions";
CREATE POLICY "practice_sessions_select" ON "practice_sessions"
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "practice_sessions_insert" ON "practice_sessions";
CREATE POLICY "practice_sessions_insert" ON "practice_sessions"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "practice_sessions_delete" ON "practice_sessions";
CREATE POLICY "practice_sessions_delete" ON "practice_sessions"
  FOR DELETE USING (auth.uid() = user_id);

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
  FOR UPDATE USING (auth.uid() = id);

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
-- topic_post_likes
-- =============================================================================
ALTER TABLE "topic_post_likes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "topic_post_likes_select" ON "topic_post_likes";
CREATE POLICY "topic_post_likes_select" ON "topic_post_likes"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "topic_post_likes_insert" ON "topic_post_likes";
CREATE POLICY "topic_post_likes_insert" ON "topic_post_likes"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "topic_post_likes_delete" ON "topic_post_likes";
CREATE POLICY "topic_post_likes_delete" ON "topic_post_likes"
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
  FOR UPDATE USING (auth.uid() = user_id);

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
  FOR UPDATE USING (auth.uid() = user_id);

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
