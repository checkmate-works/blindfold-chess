import type { SupabaseClient } from '@supabase/supabase-js';

/** Auth's "no such user" status, the one error that answers the question. */
const NOT_FOUND = 404;

/**
 * Of `ids`, the ones with no `auth.users` row left — accounts purged 30 days
 * after 退会, whose rows this admin view still holds.
 *
 * Only a *generic* target id needs asking. Every FK to `auth.users` is CASCADE
 * or SET NULL, so a purge takes the referencing row with it or nulls the id,
 * and a surviving non-null FK id always has a live account behind it (see
 * `AdminUserLink`). A `target_id` column is polymorphic and therefore bound to
 * nothing: `moderation_actions` and `user_activity_log` both keep pointing at
 * a user long after the purge, and without this check those rows would claim
 * the account merely never finished registering.
 *
 * Pass only the ids that failed to resolve to a profile. A user with a profile
 * has an account by construction, and each id here costs an Admin API
 * round-trip — on a normal page the list is empty, because moderation and
 * social targets are registered users.
 *
 * Conservative on failure: an id is reported purged only on a definitive 404.
 * A timeout or a 500 leaves it out, so a blip downgrades the row to the
 * provisional label rather than announcing a deletion that did not happen.
 */
export async function findPurgedUserIds(
  adminClient: SupabaseClient,
  ids: string[]
): Promise<Set<string>> {
  const checked = await Promise.all(
    ids.map(async (id) => {
      const { data, error } = await adminClient.auth.admin.getUserById(id);
      if (error) return error.status === NOT_FOUND ? id : null;
      return data?.user ? null : id;
    })
  );

  return new Set(checked.filter((id): id is string => id !== null));
}
