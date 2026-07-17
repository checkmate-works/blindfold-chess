-- Scheduled maintenance jobs (pg_cron)
--
-- Applied by scripts/migrate.ts in Supabase environments (local and
-- production), after RLS / grants / storage setup. The whole file is
-- idempotent: CREATE EXTENSION is guarded, and cron.schedule() upserts by
-- job name (pg_cron >= 1.4), so re-running on every migrate simply
-- refreshes the job definitions — same convention as the other files in
-- this directory.
--
-- pg_cron executes jobs inside the database with the privileges of the
-- role that scheduled them (the migration role), so the DELETE below is
-- not subject to RLS.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Notifications retention (issue #31).
--
-- Notifications are ephemeral inbox state: after 90 days they are neither
-- surfaced in the UI in practice nor actionable, but without a cleanup
-- they accumulate forever (the only delete path was the user-deletion
-- CASCADE). Drop rows older than 90 days, read or unread, once a day at a
-- low-traffic hour (05:00 UTC).
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 5 * * *',
  $$DELETE FROM public.notifications WHERE created_at < now() - interval '90 days'$$
);

-- Auth dummy-user cleanup (issue #38).
--
-- App-store review bots (Firebase Test Lab etc.) leave auth.users rows whose
-- "email" is a random token without an '@' and whose user metadata is empty.
-- They can never sign in again (no deliverable address) and — since UGC
-- requires a profiles row — can own no content, so deleting them is safe.
-- Criteria are deliberately conservative:
--   * email present but not an address (no '@') — NULL emails are left alone
--     (could be phone / anonymous auth if ever enabled)
--   * empty raw_user_meta_data
--   * not a Supabase anonymous-sign-in user
--   * older than 7 days (never races an in-flight signup)
--   * no profiles row (belt-and-braces: never touch a registered member)
-- auth-schema children (identities, sessions, refresh tokens) cascade via
-- Supabase's own FKs; public-schema FKs to auth.users are defined in
-- foreign_keys_and_grants.sql with their own ON DELETE behavior.
SELECT cron.schedule(
  'cleanup-dummy-auth-users',
  '10 5 * * *',
  $$
    DELETE FROM auth.users u
    WHERE u.email IS NOT NULL
      AND u.email NOT LIKE '%@%'
      AND (u.raw_user_meta_data IS NULL OR u.raw_user_meta_data = '{}'::jsonb)
      AND u.is_anonymous = false
      AND u.created_at < now() - interval '7 days'
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  $$
);
