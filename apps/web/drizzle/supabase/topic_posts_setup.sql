-- Topic Posts Setup
-- This file configures FK constraints and permissions for the topic_posts table.
--
-- This file is automatically applied by scripts/migrate.ts on Supabase environments.
-- It requires Supabase-managed roles (supabase_auth_admin, authenticated, anon)
-- and will fail on local PostgreSQL — this is intentional.

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
