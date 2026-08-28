import type { SupabaseClient } from '@supabase/supabase-js';

/** The public Storage bucket holding user avatars. */
export const AVATAR_BUCKET = 'avatars' as const;

/**
 * Canonical object path for a user's avatar.
 *
 * One object per user, always the same name, so an upload overwrites in place
 * and the public URL never changes (the `?t=` query the upload route appends
 * is what busts the CDN copy).
 */
export function avatarFilePath(userId: string): string {
  return `${userId}/avatar.webp`;
}

/**
 * Removes every object under the user's avatar folder, not just
 * {@link avatarFilePath}.
 *
 * The fixed `avatar.webp` name is a later convention: earlier uploads stored
 * the original extension (`avatar.png`, `avatar.jpg`), so a folder can still
 * hold objects the canonical path does not name. Deleting only the canonical
 * path would leave those behind forever — invisible to the user, still billed,
 * and still publicly readable through the bucket's `select` policy even after
 * the profile stops pointing at them. Listing first is what makes the removal
 * exhaustive.
 *
 * Best-effort by design: every caller (avatar delete, avatar re-upload,
 * account deletion) has already committed, or is about to commit, the
 * authoritative change in Postgres. A leftover object nothing references is
 * harmless next to failing the operation the user actually asked for, so
 * Storage errors are swallowed rather than propagated.
 *
 * The client is a parameter because the callers differ in authority: the API
 * routes pass the request's authenticated client and rely on the
 * `avatars_delete_own` RLS policy to scope the delete to the caller's own
 * folder, while account deletion passes the service-role client because it
 * runs without a user session.
 */
export async function removeAllAvatarFiles(client: SupabaseClient, userId: string): Promise<void> {
  try {
    const { data: existingFiles } = await client.storage.from(AVATAR_BUCKET).list(userId);
    if (existingFiles?.length) {
      await client.storage
        .from(AVATAR_BUCKET)
        .remove(existingFiles.map((file) => `${userId}/${file.name}`));
    }
  } catch (err) {
    console.warn(`Failed to remove avatar files for user ${userId}:`, err);
  }
}
