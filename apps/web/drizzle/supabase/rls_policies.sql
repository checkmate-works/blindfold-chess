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
-- follows
-- =============================================================================
ALTER TABLE "follows" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_select" ON "follows";
CREATE POLICY "follows_select" ON "follows"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "follows_insert" ON "follows";
CREATE POLICY "follows_insert" ON "follows"
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_delete" ON "follows";
CREATE POLICY "follows_delete" ON "follows"
  FOR DELETE USING (auth.uid() = follower_id);

-- =============================================================================
-- blocks
-- =============================================================================
ALTER TABLE "blocks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks_select" ON "blocks";
CREATE POLICY "blocks_select" ON "blocks"
  FOR SELECT USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "blocks_insert" ON "blocks";
CREATE POLICY "blocks_insert" ON "blocks"
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "blocks_delete" ON "blocks";
CREATE POLICY "blocks_delete" ON "blocks"
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
