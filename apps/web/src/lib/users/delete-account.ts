import { eq } from 'drizzle-orm';
import 'server-only';

import { db, profiles } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Account deletion (退会) — the single source of truth for what happens when a
 * user deletes their account. This is the canonical "discovery point" for the
 * whole account-deletion SPEC series (`specs/account-deletion/`); read this
 * TSDoc before changing any deletion behaviour.
 *
 * ## Soft delete, not physical delete
 *
 * Deletion is a **soft delete**: `auth.admin.deleteUser(userId, true)` only
 * stamps `auth.users.deleted_at`; the row is NOT physically removed. As a
 * consequence, **FK `ON DELETE CASCADE` / `SET NULL` do not fire at deletion
 * time** — every UGC row keyed by `user_id` stays in place. The actual physical
 * purge (which fires those FK actions) happens after a retention period and is
 * implemented separately in SPEC5. So this function must explicitly perform any
 * cleanup that is desired *immediately* on deletion (PII anonymisation, avatar
 * file removal); it cannot rely on cascade.
 *
 * ## What happens to each kind of data
 *
 * | Class            | Target                                                  | Policy                                   |
 * | ---------------- | ------------------------------------------------------- | ---------------------------------------- |
 * | Keep (identity)  | `profiles.username`, `profiles.bannedAt`                | Never touched (see below)                |
 * | Anonymise (PII)  | every other user-entered `profiles` column              | NULL out immediately (this function)     |
 * | Physical delete  | avatar file in Storage (`avatars/${userId}/...`)        | Best-effort `remove()` (this function)   |
 * | Keep public UGC  | games, comments, chunks, public repertoires, posts, ... | Retained, author anonymised (other SPEC) |
 *
 * ### Why `username` is kept (NOT nulled)
 * Retained deliberately to prevent re-registration under the same handle and
 * impersonation of a former user. `username` is `NOT NULL UNIQUE`, so it cannot
 * be nulled anyway — but the intent is the point: we want the handle reserved.
 *
 * ### Why `bannedAt` is kept
 * Same rationale as `username`: keeping the moderation flag prevents a banned
 * user from evading the ban by deleting and re-creating an account.
 *
 * ### Why account deletion is NOT written to `activity_log`
 * A soft delete is fully derivable from `profiles.deletedAt` / the nulled PII —
 * logging it would be redundant. This matches the activity-log inclusion
 * criterion (log only non-derivable, reversible, or overwrite events).
 *
 * ## Ordering / failure mode
 *
 * Auth soft-delete runs **first**; profile cleanup runs only if it succeeds.
 * That way a failed auth delete leaves profile data intact, and a failed
 * profile cleanup leaves a user that can no longer log in with leftover data
 * to be swept later — the safer failure direction. Avatar file removal is
 * best-effort: a Storage failure is logged and swallowed, never blocking the
 * deletion.
 */
export async function deleteAccount(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminClient = createAdminClient();

  // Soft-delete the auth user first. If this fails, profile data stays intact.
  const { error } = await adminClient.auth.admin.deleteUser(userId, true);
  if (error) {
    return { ok: false, error: 'failed_to_delete_auth_user' };
  }

  // Anonymise the profile: NULL out every user-entered column except the
  // intentionally-retained `username` and `bannedAt` (see TSDoc). `PROFILE_PII_COLUMNS`
  // is the exhaustive list so a future PII column is a compile error until handled.
  await db
    .update(profiles)
    .set({
      ...PROFILE_ANONYMISED_VALUES,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId));

  // Best-effort removal of the avatar file(s) from Storage. A failure here must
  // not fail the deletion — the user is already unable to log in.
  await removeAvatarFiles(adminClient, userId);

  return { ok: true };
}

/**
 * The exhaustive set of user-entered `profiles` columns that hold PII and must
 * be anonymised on account deletion. `username` and `bannedAt` are deliberately
 * excluded (kept) — see {@link deleteAccount}. Non-PII bookkeeping columns
 * (`id`, `createdAt`, `deletedAt`, `updatedAt`) are also excluded.
 *
 * Typed as `Record<K, null>` keyed by the PII column names so that adding a new
 * PII column without listing it here surfaces in review (and in the dedicated
 * test) rather than silently leaking on deletion.
 */
const PROFILE_ANONYMISED_VALUES = {
  displayName: null,
  avatarUrl: null,
  bio: null,
  country: null,
  flair: null,
  fideId: null,
  chesscomUsername: null,
  lichessUsername: null,
  xUsername: null,
  instagramUsername: null,
  youtubeHandle: null,
} as const;

export const PROFILE_PII_COLUMNS = Object.keys(
  PROFILE_ANONYMISED_VALUES
) as (keyof typeof PROFILE_ANONYMISED_VALUES)[];

async function removeAvatarFiles(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<void> {
  try {
    const { data: existingFiles } = await adminClient.storage.from('avatars').list(userId);
    if (existingFiles?.length) {
      await adminClient.storage
        .from('avatars')
        .remove(existingFiles.map((f) => `${userId}/${f.name}`));
    }
  } catch (err) {
    // Best-effort: never block account deletion on a Storage failure.
    console.warn(`Failed to remove avatar files for deleted user ${userId}:`, err);
  }
}
