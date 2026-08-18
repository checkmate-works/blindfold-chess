import { and, asc, isNotNull, lt } from 'drizzle-orm';
import 'server-only';

import { db, profiles } from '@/lib/db';
import { startRetentionRun } from '@/lib/retention-run';
import { captureError } from '@/lib/sentry/capture-error';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Physical purge of soft-deleted accounts after the retention period — the
 * final stage of the account-deletion lifecycle, whose first stage (and
 * canonical entry point) is
 * {@link import('./delete-account').deleteAccount}.
 *
 * ## Where this sits in the lifecycle
 *
 * Account deletion is a two-stage process:
 *   1. **Soft delete** ({@link import('./delete-account').deleteAccount}) — at
 *      退会 time the auth user is soft-deleted (`auth.users.deleted_at` set),
 *      PII on `profiles` is anonymised, the avatar file is removed, Stripe is
 *      canceled, and likes *received* on the user's own content are deleted.
 *      The `auth.users` row physically survives, so **no FK fires yet**.
 *   2. **Physical purge** (this module) — after `ACCOUNT_PURGE_RETENTION_DAYS`,
 *      a daily cron hard-deletes the `auth.users` row, which finally fires the
 *      FK actions: `ON DELETE CASCADE` reaps the private data (likes given by
 *      no-one else, follows, notifications, challenge results, points, ranks,
 *      …) and `ON DELETE SET NULL` anonymises the public content that is kept
 *      (games, chunks, repertoires, topic_posts, positions, and likes the user
 *      *gave*, which survive with `user_id = NULL`).
 *
 * ## Why the retention window
 *
 * The window is the grace period during which `profiles.username` and
 * `profiles.bannedAt` are deliberately held (re-registration / ban-evasion
 * defence — see {@link import('./delete-account').deleteAccount}). It is also a
 * safety buffer for accidental or disputed deletions before the data becomes
 * irrecoverable.
 *
 * ## Why hard delete fires the cascade (and the profiles FK)
 *
 * `auth.admin.deleteUser(id)` *without* the second arg is a hard delete (the退会
 * path passes `true` for a soft delete). The `profiles.id → auth.users` FK is
 * `ON DELETE CASCADE` **specifically so this purge works**: a hard delete
 * removes the auth row, cascade-removes the profile (releasing the
 * username/bannedAt hold), and lets every other user-data FK fire. (That FK was
 * RESTRICT until this purge was introduced, which would have blocked the hard
 * delete entirely — do not restore it.)
 *
 * ## Prerequisite this purge depends on (do not undo)
 *
 * The `likes` / `topic_posts` / `positions` user FKs must stay `SET NULL` —
 * see `ensure_auth_users_fk` in
 * `apps/web/drizzle/supabase/foreign_keys_and_grants.sql`. Were any of them
 * switched back to CASCADE, this hard delete would silently destroy the user's
 * *given* likes and their public posts / positions instead of anonymising
 * them, turning "keep the content, drop the identity" into a content wipe.
 *
 * @design Best-effort, idempotent, retry-safe
 *
 * Each account is purged independently; one failure is logged (console +
 * Sentry) and counted, never aborting the batch. A successful purge cascade-
 * removes the `profiles` row, so the account drops out of the eligibility query
 * and is never reprocessed; a failed purge leaves the row in place to be
 * retried on the next run. The function is therefore safe to run repeatedly and
 * safe to overlap.
 *
 * @design Per-run cap + wall-clock budget
 *
 * Each account costs one Supabase Admin API round-trip, so a large backlog
 * (e.g. the first run after enabling the cron) is bounded two ways: at most
 * `maxPerRun` accounts are selected per invocation, and the loop bails as soon
 * as `budgetMs` of wall-clock is spent, leaving the rest for the next daily
 * run. The report's `timedOut` / `scanned` fields tell operators whether a
 * backlog remains.
 */

/** Days a soft-deleted account is retained before it is physically purged. */
export const ACCOUNT_PURGE_RETENTION_DAYS = 30;

export const ACCOUNT_PURGE_RETENTION_MS = ACCOUNT_PURGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Maximum accounts purged per invocation. Purges are rare (only accounts past
 * the retention window), so this is a backstop against an unbounded first run,
 * not a normal limit. Any remainder is picked up by the next daily run.
 */
const DEFAULT_MAX_PER_RUN = 500;

/**
 * Wall-clock budget. Leaves headroom under Vercel function timeouts so the
 * response returns cleanly even when the purge bails early on a backlog.
 */
const DEFAULT_BUDGET_MS = 45_000;

export type PurgeDeletedAccountsReport = {
  /** Accounts whose `auth.users` row was hard-deleted this run. */
  purged: number;
  /** Accounts whose hard delete failed (left in place for the next run). */
  failed: number;
  /** Eligible accounts selected this run (`purged + failed + unprocessed`). */
  scanned: number;
  /** True if the run hit its wall-clock budget with accounts still unprocessed. */
  timedOut: boolean;
  /** Accounts soft-deleted at or before this instant were eligible (ISO). */
  cutoff: string;
  startedAt: string;
  finishedAt: string;
};

export async function purgeDeletedAccounts(
  opts: { now?: Date; budgetMs?: number; maxPerRun?: number } = {}
): Promise<PurgeDeletedAccountsReport> {
  const maxPerRun = opts.maxPerRun ?? DEFAULT_MAX_PER_RUN;
  const run = startRetentionRun({
    now: opts.now,
    retentionMs: ACCOUNT_PURGE_RETENTION_MS,
    budgetMs: opts.budgetMs ?? DEFAULT_BUDGET_MS,
  });

  // Select eligible accounts once, oldest soft-delete first. Successful purges
  // cascade-remove the profile (so they never reappear); failures stay and are
  // retried next run — so a single in-memory pass is enough and avoids
  // re-querying around failures.
  const targets = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(isNotNull(profiles.deletedAt), lt(profiles.deletedAt, run.cutoff)))
    .orderBy(asc(profiles.deletedAt))
    .limit(maxPerRun);

  const adminClient = createAdminClient();

  let purged = 0;
  let failed = 0;
  let timedOut = false;

  for (const { id } of targets) {
    if (run.isOverBudget()) {
      timedOut = true;
      break;
    }
    if (await hardDeleteAccount(adminClient, id)) {
      purged += 1;
    } else {
      failed += 1;
    }
  }

  return {
    purged,
    failed,
    scanned: targets.length,
    timedOut,
    cutoff: run.cutoff.toISOString(),
    ...run.stamps(),
  };
}

/**
 * Hard-delete one account's `auth.users` row (no second arg → fires the FK
 * cascade / set-null). Best-effort: a returned error or a thrown exception is
 * logged + reported and swallowed, so one bad account never aborts the batch.
 *
 * @returns `true` when the account was purged, `false` on any failure (the
 *   profile row survives, so the next run retries it).
 */
async function hardDeleteAccount(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      captureError(error, `[purgeDeletedAccounts] hard delete failed for ${userId}`);
      return false;
    }
    return true;
  } catch (err) {
    captureError(err, `[purgeDeletedAccounts] hard delete threw for ${userId}`);
    return false;
  }
}
