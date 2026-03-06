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
