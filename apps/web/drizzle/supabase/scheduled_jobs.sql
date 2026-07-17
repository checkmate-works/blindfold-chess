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
