import { revalidateTag } from 'next/cache';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import 'server-only';

import { cancelAllActiveSubscriptions } from '@/lib/billing/cancel-subscriptions';
import { profileCacheTag } from '@/lib/cache-tags';
import {
  chunks,
  db,
  gameComments,
  games,
  likes,
  positions,
  profiles,
  repertoires,
  topicPosts,
} from '@/lib/db';
import { captureError } from '@/lib/sentry/capture-error';
import { createAdminClient } from '@/lib/supabase/admin';

import { removeAllAvatarFiles } from './avatar-storage';

/**
 * Account deletion (退会) — the single source of truth for what happens when a
 * user deletes their account, and the canonical "discovery point" for the whole
 * lifecycle: read this TSDoc before changing any deletion behaviour. The other
 * half of the lifecycle (the retention-delayed physical purge) documents itself
 * in {@link import('./purge-deleted-accounts').purgeDeletedAccounts}, and the
 * manual right-to-erasure procedure lives in
 * `apps/web/docs/account-erasure-runbook.md`.
 *
 * ## Soft delete, not physical delete
 *
 * Deletion is a **soft delete**: `auth.admin.deleteUser(userId, true)` only
 * stamps `auth.users.deleted_at`; the row is NOT physically removed. As a
 * consequence, **FK `ON DELETE CASCADE` / `SET NULL` do not fire at deletion
 * time** — every UGC row keyed by `user_id` stays in place. The actual physical
 * purge (which fires those FK actions) happens after a retention period, in
 * {@link import('./purge-deleted-accounts').purgeDeletedAccounts}. So this
 * function must explicitly perform any
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
 * | Physical delete  | likes *received* on the user's own content              | Deleted immediately (this function)      |
 * | Soft delete      | the user's *draft* (unpublished) chunks                 | Retired immediately (this function)      |
 * | Keep (anonymise) | likes the user *gave* to others' content                | Kept; `user_id → NULL` on purge (FK)     |
 * | Keep public UGC  | games, comments, *published* chunks, posts, positions…  | Retained; author anonymised on purge     |
 *
 * ### Likes — given vs. received (the two halves are split by mechanism)
 * The product rule is: a like the user *gave* survives (anonymised), and a like
 * the user *received* on their own content is erased. The FK
 * `likes.user_id → auth.users ON DELETE SET NULL` covers the *given* half on
 * physical purge. The *received* half has no FK to ride — `likes` is
 * polymorphic over `(target_type, target_id)` with no constraint on the target —
 * so it is deleted explicitly here, synchronously at deletion time, by
 * {@link deleteReceivedLikes}. (Coins already paid for those likes are NOT
 * clawed back; the `point_events` ledger is append-only — see grant-like-coins.)
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
 * 1. **Stripe subscriptions are canceled first**, before anything irreversible.
 *    The whole point is to never leave a deleted account being billed, so we
 *    must confirm billing has stopped *before* completing the deletion. A real
 *    cancellation failure aborts the entire flow and returns an error (→ 500),
 *    leaving the account fully intact so the user can retry. "No subscription"
 *    and "already canceled" are not failures (handled idempotently in
 *    {@link cancelAllActiveSubscriptions}); subscription-less users (the vast
 *    majority) pass straight through. This step is deliberately NOT written to
 *    `activity_log`, for the same reason the deletion itself is not (above):
 *    the cancellation is derivable from the `subscriptions` row it updates.
 * 2. **Auth soft-delete** runs next; profile cleanup runs only if it succeeds.
 *    That way a failed auth delete leaves profile data intact, and a failed
 *    profile cleanup leaves a user that can no longer log in with leftover data
 *    to be swept later — the safer failure direction.
 * 3. **Avatar file removal** is best-effort: a Storage failure is logged and
 *    swallowed, never blocking the deletion.
 *
 * ### Why not a DB transaction
 * The flow spans three systems (Stripe, Supabase Auth/GoTrue, Postgres); a DB
 * transaction can only cover the Postgres writes. A succeeded Stripe cancellation
 * is irreversible, so there is nothing to "roll back" — atomicity is achieved by
 * ordering (irreversible external call first) + idempotent retry instead.
 */
export async function deleteAccount(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminClient = createAdminClient();

  // Cancel any active Stripe subscription BEFORE the irreversible auth delete.
  // If this fails (anything other than "already gone"), abort the whole deletion
  // so the user can retry — we must confirm billing has stopped first.
  try {
    await cancelAllActiveSubscriptions(userId);
  } catch (err) {
    captureError(err, `Failed to cancel subscriptions for user ${userId} during deletion`);
    return { ok: false, error: 'failed_to_cancel_subscription' };
  }

  // Soft-delete the auth user. If this fails, profile data stays intact.
  const { error } = await adminClient.auth.admin.deleteUser(userId, true);
  if (error) {
    return { ok: false, error: 'failed_to_delete_auth_user' };
  }

  // Immediate cleanup that should happen on deletion (not deferred to purge):
  await anonymiseProfile(userId); // NULL the PII columns + stamp deletedAt
  await softDeleteDraftChunks(userId); // retire unpublished WIP chunks
  await deleteReceivedLikes(userId); // drop likes received on the user's content
  await removeAllAvatarFiles(adminClient, userId); // best-effort Storage cleanup

  return { ok: true };
}

/**
 * Soft-delete the user's *draft* chunks. Published chunks are public catalog
 * content and are kept (anonymised on purge by the SET NULL FK), but a draft is
 * unpublished, author-only WIP: once the author is gone it can never leave draft
 * (publish / edit / delete are all gated on `chunk.userId === caller`), so a
 * retained draft is an invisible, unpublishable dead row. We retire it with the
 * same soft-delete the author's own `deleteChunkEntry` uses — an UPDATE, so it
 * never trips the `position_chunks` / `game_chunks` chunk_id RESTRICT FKs
 * (drafts cannot be attached anyway; attachment is published-only).
 */
async function softDeleteDraftChunks(userId: string): Promise<void> {
  await db
    .update(chunks)
    .set({ deletedAt: new Date() })
    .where(and(eq(chunks.userId, userId), eq(chunks.status, 'draft'), isNull(chunks.deletedAt)));
}

/**
 * Anonymise the profile: NULL out every user-entered column except the
 * intentionally-retained `username` and `bannedAt` (see {@link deleteAccount}),
 * and stamp `deletedAt`. `PROFILE_ANONYMISED_VALUES` is the exhaustive PII list,
 * so a future PII column is a compile error (and a test failure) until handled.
 */
async function anonymiseProfile(userId: string): Promise<void> {
  const [updated] = await db
    .update(profiles)
    .set({
      ...PROFILE_ANONYMISED_VALUES,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning({ username: profiles.username });

  // `/u/[username]` caches the row under a per-username tag and filters
  // `deleted_at IS NULL`, so without this expiry the withdrawn account's
  // profile — PII included — keeps rendering for up to an hour. The username
  // survives anonymisation (see the TSDoc above), which is what makes it
  // available as the tag here.
  if (updated) {
    revalidateTag(profileCacheTag(updated.username), { expire: 0 });
  }
}

/**
 * The likeable content kinds keyed by their polymorphic `likes.target_type`
 * value, each paired with the table and owner column that decide whose content
 * it is. This is the exhaustive set of targets `toggleLikeForTarget` /
 * `performEntityToggleLike` can write — keep it in sync if a new likeable
 * entity is added. The string values are stored data (`likes.target_type`),
 * matching the constants the like actions use: `'game'` = `GAME_LIKE_TARGET`
 * (`@/lib/db/like-queries`), `'game_comment'` = `GAME_COMMENT_LIKE_TARGET`
 * (`@/lib/db/game-comments`); `topic_post` / `position` / `chunk` / `repertoire`
 * are written as literals by their respective `like-actions.ts`.
 */
const LIKEABLE_OWNED_CONTENT = [
  { targetType: 'topic_post', table: topicPosts, ownerColumn: topicPosts.userId },
  { targetType: 'position', table: positions, ownerColumn: positions.userId },
  { targetType: 'chunk', table: chunks, ownerColumn: chunks.userId },
  { targetType: 'repertoire', table: repertoires, ownerColumn: repertoires.userId },
  { targetType: 'game', table: games, ownerColumn: games.authorId },
  { targetType: 'game_comment', table: gameComments, ownerColumn: gameComments.authorId },
] as const;

/**
 * Physically delete every like that targets content owned by `userId` — i.e.
 * the likes the withdrawing user *received*. One scoped DELETE per likeable
 * content kind: drop `likes` rows whose `(target_type, target_id)` points at a
 * row the user owns. Runs synchronously at deletion time; soft-deleted content
 * still counts as owned, so its received likes go too. The content rows
 * themselves are untouched — they are kept, and their author is anonymised
 * later by the purge's `ON DELETE SET NULL`.
 */
async function deleteReceivedLikes(userId: string): Promise<void> {
  for (const { targetType, table, ownerColumn } of LIKEABLE_OWNED_CONTENT) {
    await db
      .delete(likes)
      .where(
        and(
          eq(likes.targetType, targetType),
          inArray(
            likes.targetId,
            db.select({ id: table.id }).from(table).where(eq(ownerColumn, userId))
          )
        )
      );
  }
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
