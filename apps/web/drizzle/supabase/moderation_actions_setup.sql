-- Moderation Actions Setup
-- This file configures FK constraints and permissions for the moderation_actions table.
--
-- This file is automatically applied by scripts/migrate.ts on Supabase environments.
-- It requires Supabase-managed roles (supabase_auth_admin, authenticated, anon)
-- and will fail on local PostgreSQL — this is intentional.

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
