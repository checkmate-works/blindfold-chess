-- Foreign Keys and Grants
-- This file configures FK constraints (to auth.users) and table-level
-- permissions for all tables that reference Supabase Auth.
--
-- This file is automatically applied by scripts/migrate.ts on Supabase environments.
-- It requires Supabase-managed roles (supabase_auth_admin, authenticated, anon)
-- and will fail on local PostgreSQL — this is intentional.

-- =============================================================================
-- profiles
-- =============================================================================

-- Cleanup: remove legacy trigger and function (moved to app layer)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- FK constraint: profiles.id → auth.users(id)
-- Using DO block to avoid errors if the constraint already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

-- =============================================================================
-- topic_posts
-- =============================================================================

-- FK constraint: topic_posts.user_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topic_posts_user_id_fkey'
  ) THEN
    ALTER TABLE public.topic_posts
      ADD CONSTRAINT topic_posts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: topic_posts.parent_id → topic_posts(id) (self-reference for replies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topic_posts_parent_id_fkey'
  ) THEN
    ALTER TABLE public.topic_posts
      ADD CONSTRAINT topic_posts_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.topic_posts(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.topic_posts TO authenticated;
GRANT SELECT ON TABLE public.topic_posts TO anon;

-- =============================================================================
-- moderation_actions
-- =============================================================================

-- FK constraint: moderation_actions.actor_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'moderation_actions_actor_id_fkey'
  ) THEN
    ALTER TABLE public.moderation_actions
      ADD CONSTRAINT moderation_actions_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT ON TABLE public.moderation_actions TO authenticated;

-- =============================================================================
-- user_follows & user_blocks
-- =============================================================================

-- FK constraint: user_follows.follower_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_follower_id_fkey'
  ) THEN
    ALTER TABLE public.user_follows
      ADD CONSTRAINT user_follows_follower_id_fkey
      FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: user_follows.following_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_following_id_fkey'
  ) THEN
    ALTER TABLE public.user_follows
      ADD CONSTRAINT user_follows_following_id_fkey
      FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: user_blocks.blocker_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocker_id_fkey'
  ) THEN
    ALTER TABLE public.user_blocks
      ADD CONSTRAINT user_blocks_blocker_id_fkey
      FOREIGN KEY (blocker_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: user_blocks.blocked_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocked_id_fkey'
  ) THEN
    ALTER TABLE public.user_blocks
      ADD CONSTRAINT user_blocks_blocked_id_fkey
      FOREIGN KEY (blocked_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.user_follows TO authenticated;
GRANT SELECT ON TABLE public.user_follows TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_blocks TO authenticated;

-- =============================================================================
-- notifications
-- =============================================================================

-- FK constraint: notifications.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: notifications.actor_id → auth.users(id) ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_actor_id_fkey'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- Grant necessary permissions (no INSERT — controlled by server-side only)
GRANT SELECT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;

-- =============================================================================
-- practice_sessions
-- =============================================================================

-- FK constraint: practice_sessions.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'practice_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE public.practice_sessions
      ADD CONSTRAINT practice_sessions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.practice_sessions TO authenticated;

-- =============================================================================
-- rate_limit_events
-- =============================================================================

-- FK constraint: rate_limit_events.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rate_limit_events_user_id_fkey'
  ) THEN
    ALTER TABLE public.rate_limit_events
      ADD CONSTRAINT rate_limit_events_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT INSERT ON TABLE public.rate_limit_events TO authenticated;

-- =============================================================================
-- user_activity_log
-- =============================================================================

-- FK constraint: user_activity_log.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_activity_log_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_activity_log
      ADD CONSTRAINT user_activity_log_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT ON TABLE public.user_activity_log TO authenticated;

-- =============================================================================
-- user_roles
-- =============================================================================

-- FK constraint: user_roles.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON TABLE public.user_roles TO authenticated;

-- =============================================================================
-- topic_post_likes
-- =============================================================================

-- FK constraint: topic_post_likes.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topic_post_likes_user_id_fkey'
  ) THEN
    ALTER TABLE public.topic_post_likes
      ADD CONSTRAINT topic_post_likes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.topic_post_likes TO authenticated;
GRANT SELECT ON TABLE public.topic_post_likes TO anon;
