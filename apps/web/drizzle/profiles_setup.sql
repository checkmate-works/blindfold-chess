-- Profiles Setup
-- This file configures FK constraints, auto-creation trigger, and permissions
-- for the profiles table.
--
-- This file is automatically applied by scripts/migrate.ts on Supabase environments.
-- It requires Supabase-managed roles (supabase_auth_admin, authenticated, anon)
-- and will fail on local PostgreSQL — this is intentional.

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

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    'user_' || substring(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'ユーザー'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to ensure it's up to date
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO supabase_auth_admin;
GRANT INSERT ON TABLE public.profiles TO supabase_auth_admin;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.handle_new_user FROM public;
