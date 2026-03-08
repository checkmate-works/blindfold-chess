-- Follows & Blocks Setup
-- This file configures FK constraints and permissions for the follows and blocks tables.
--
-- This file is automatically applied by scripts/migrate.ts on Supabase environments.
-- It requires Supabase-managed roles (supabase_auth_admin, authenticated, anon)
-- and will fail on local PostgreSQL — this is intentional.

-- FK constraint: follows.follower_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follows_follower_id_fkey'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_follower_id_fkey
      FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: follows.following_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follows_following_id_fkey'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_following_id_fkey
      FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: blocks.blocker_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blocks_blocker_id_fkey'
  ) THEN
    ALTER TABLE public.blocks
      ADD CONSTRAINT blocks_blocker_id_fkey
      FOREIGN KEY (blocker_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- FK constraint: blocks.blocked_id → auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blocks_blocked_id_fkey'
  ) THEN
    ALTER TABLE public.blocks
      ADD CONSTRAINT blocks_blocked_id_fkey
      FOREIGN KEY (blocked_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON TABLE public.follows TO authenticated;
GRANT SELECT ON TABLE public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.blocks TO authenticated;
