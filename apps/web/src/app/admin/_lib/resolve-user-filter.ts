import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ilike, or } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';

export type ResolvedUserFilter = {
  /** Deduped user ids matching the filter (empty = no match, caller returns an empty page). */
  matchingIds: string[];
  /**
   * The auth user list fetched while resolving. Forward to
   * `loadUsersEmailMap` so the per-row email column reuses it instead of
   * paying for a second identical `listUsers` round-trip in the same
   * request.
   */
  preloadedAuthUsers: User[] | undefined;
};

/**
 * Resolve a free-text admin user filter against `profiles.username /
 * displayName` (ILIKE) AND Supabase Auth `users.email` (via the admin
 * client, capped at 100 users — the established scope of these admin
 * views). Shared by the audit-log, activity-log and topic_posts pages.
 */
export async function resolveUserFilter(
  adminClient: SupabaseClient,
  userFilter: string
): Promise<ResolvedUserFilter> {
  const matchingProfiles = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      or(
        ilike(profiles.username, `%${userFilter}%`),
        ilike(profiles.displayName, `%${userFilter}%`)
      )
    );

  const listUsersResult = await adminClient.auth.admin.listUsers({ page: 1, perPage: 100 });
  const preloadedAuthUsers = listUsersResult.data?.users;
  const matchingEmailUserIds = (preloadedAuthUsers ?? [])
    .filter((u) => u.email?.toLowerCase().includes(userFilter.toLowerCase()))
    .map((u) => u.id);

  return {
    matchingIds: [...new Set([...matchingProfiles.map((p) => p.id), ...matchingEmailUserIds])],
    preloadedAuthUsers,
  };
}
