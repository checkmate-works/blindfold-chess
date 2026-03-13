-- Notifications Setup
-- This file configures FK constraints and permissions for the notifications table.
--
-- This file is automatically applied by scripts/migrate.ts on Supabase environments.
-- It requires Supabase-managed roles (supabase_auth_admin, authenticated, anon)
-- and will fail on local PostgreSQL — this is intentional.

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
