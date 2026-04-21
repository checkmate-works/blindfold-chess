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
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
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

-- Server-side only writes; revoke any client-role grants (RLS deny-by-default).
REVOKE ALL ON TABLE public.rate_limit_events FROM authenticated, anon;

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

-- Server-side only access; custom_access_token_hook reads via supabase_auth_admin
-- (granted in custom_access_token_hook.sql). Revoke any client-role grants.
REVOKE ALL ON TABLE public.user_roles FROM authenticated, anon;

-- =============================================================================
-- chess_openings (master data — no FK to auth.users, public read)
-- =============================================================================

-- FK constraint: chess_openings.parent_slug → chess_openings(slug) (self-reference for tree)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_chess_openings_parent_slug'
  ) THEN
    ALTER TABLE public.chess_openings
      ADD CONSTRAINT fk_chess_openings_parent_slug
      FOREIGN KEY (parent_slug) REFERENCES public.chess_openings(slug)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END;
$$;

-- Grant read permissions (master data is publicly readable)
GRANT SELECT ON TABLE public.chess_openings TO authenticated;
GRANT SELECT ON TABLE public.chess_openings TO anon;

-- =============================================================================
-- likes (polymorphic, renamed from topic_post_likes)
-- =============================================================================

-- Drop the legacy FK constraint name if it survived the table rename. The
-- rename + recreate migration drops this in SQL, but we defensively drop here
-- as well so re-runs against older snapshots stay idempotent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topic_post_likes_user_id_fkey'
  ) THEN
    ALTER TABLE public.likes DROP CONSTRAINT topic_post_likes_user_id_fkey;
  END IF;
END;
$$;

-- FK constraint: likes.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_id_fkey'
  ) THEN
    ALTER TABLE public.likes
      ADD CONSTRAINT likes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.likes TO authenticated;
GRANT SELECT ON TABLE public.likes TO anon;

-- =============================================================================
-- challenge_results
-- =============================================================================

-- FK constraint: challenge_results.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'challenge_results_user_id_fkey'
  ) THEN
    ALTER TABLE public.challenge_results
      ADD CONSTRAINT challenge_results_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions (public read for leaderboard display)
GRANT SELECT, INSERT ON TABLE public.challenge_results TO authenticated;
GRANT SELECT ON TABLE public.challenge_results TO anon;

-- =============================================================================
-- challenge_best_scores
-- =============================================================================

-- FK constraint: challenge_best_scores.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'challenge_best_scores_user_id_fkey'
  ) THEN
    ALTER TABLE public.challenge_best_scores
      ADD CONSTRAINT challenge_best_scores_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions (public read for leaderboard display, UPDATE for UPSERT)
GRANT SELECT, INSERT, UPDATE ON TABLE public.challenge_best_scores TO authenticated;
GRANT SELECT ON TABLE public.challenge_best_scores TO anon;

-- =============================================================================
-- feed_items
-- =============================================================================

-- FK constraint: feed_items.actor_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feed_items_actor_id_fkey'
  ) THEN
    ALTER TABLE public.feed_items
      ADD CONSTRAINT feed_items_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions (public read for timeline, server-side INSERT)
GRANT SELECT, INSERT ON TABLE public.feed_items TO authenticated;
GRANT SELECT ON TABLE public.feed_items TO anon;

-- =============================================================================
-- stripe_customers
-- =============================================================================

-- FK constraint: stripe_customers.user_id -> auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stripe_customers_user_id_fkey'
  ) THEN
    ALTER TABLE public.stripe_customers
      ADD CONSTRAINT stripe_customers_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Server-side only writes (no INSERT/UPDATE for authenticated)
GRANT SELECT ON TABLE public.stripe_customers TO authenticated;

-- =============================================================================
-- subscriptions
-- =============================================================================

-- FK constraint: subscriptions.user_id -> auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Users can read their own subscriptions; writes are server-side only
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

-- =============================================================================
-- user_interview_answers
-- =============================================================================

-- FK constraint: user_interview_answers.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_interview_answers_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_interview_answers
      ADD CONSTRAINT user_interview_answers_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions (public read, authenticated insert/delete)
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_interview_answers TO authenticated;
GRANT SELECT ON TABLE public.user_interview_answers TO anon;

-- =============================================================================
-- ranks
-- =============================================================================

-- Grant read permissions (master data is publicly readable)
GRANT SELECT ON TABLE public.ranks TO authenticated;
GRANT SELECT ON TABLE public.ranks TO anon;

-- =============================================================================
-- user_ranks
-- =============================================================================

-- FK constraint: user_ranks.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_ranks_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_ranks
      ADD CONSTRAINT user_ranks_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant read permissions (read-only for all, write via service role only)
GRANT SELECT ON TABLE public.user_ranks TO authenticated;
GRANT SELECT ON TABLE public.user_ranks TO anon;

-- =============================================================================
-- exp_events
-- =============================================================================

-- FK constraint: exp_events.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exp_events_user_id_fkey'
  ) THEN
    ALTER TABLE public.exp_events
      ADD CONSTRAINT exp_events_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant read permissions (authenticated can SELECT own rows via RLS, service role only write)
GRANT SELECT ON TABLE public.exp_events TO authenticated;

-- =============================================================================
-- user_exp
-- =============================================================================

-- FK constraint: user_exp.user_id → auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_exp_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_exp
      ADD CONSTRAINT user_exp_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant read permissions (public read for leaderboard, service role only write)
GRANT SELECT ON TABLE public.user_exp TO authenticated;
GRANT SELECT ON TABLE public.user_exp TO anon;
