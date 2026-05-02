import type { SupabaseClient, User } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Page size used when fetching the first page of Supabase Auth users for the
 * email lookup. Kept at 100 to preserve the historical behaviour of the
 * sites that previously inlined `listUsers({ page: 1, perPage: 100 })`.
 *
 * TODO: this is the single point to revisit when the user count grows past
 * what one page can hold — switch to paginated retrieval here and every
 * caller benefits without changes at the call sites.
 */
const FIRST_PAGE_PER_PAGE = 100;

/**
 * Fetch a `Map<userId, email>` for the given user ids.
 *
 * Internally calls `auth.admin.listUsers({ page: 1, perPage: 100 })` and
 * keeps only the entries whose ids appear in `userIds`. Users without an
 * email are simply omitted from the returned Map (matching the historical
 * behaviour at every call site we replaced).
 *
 * - Returns an empty Map immediately when `userIds` is empty.
 * - Deduplicates `userIds` internally so callers do not need to pre-filter.
 * - Accepts an optional `preloadedUsers` array — when provided, the helper
 *   uses it instead of calling `listUsers` again. This lets callers that
 *   already fetched the first page (e.g. an email-substring filter) reuse
 *   that result instead of paying for a second identical Auth round-trip
 *   in the same request.
 *
 * The hardcoded `perPage: 100` is preserved on purpose for now — the
 * surrounding ticket scope is "extract the duplication, do not change
 * behaviour". When pagination is later required, this helper is the
 * single place to update.
 */
export async function loadUsersEmailMap(
  userIds: readonly string[],
  options?: {
    /** Reuse an already-fetched user list instead of issuing a new listUsers call. */
    preloadedUsers?: readonly User[];
    /** Inject a Supabase admin client (defaults to `createAdminClient()`). */
    adminClient?: SupabaseClient;
  }
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const uniqueIds = new Set(userIds);

  const users =
    options?.preloadedUsers ??
    (await fetchAuthUsersFirstPage(options?.adminClient ?? createAdminClient()));

  const emailMap = new Map<string, string>();
  for (const user of users) {
    if (uniqueIds.has(user.id) && user.email) {
      emailMap.set(user.id, user.email);
    }
  }
  return emailMap;
}

async function fetchAuthUsersFirstPage(adminClient: SupabaseClient): Promise<User[]> {
  const { data } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: FIRST_PAGE_PER_PAGE,
  });
  return data?.users ?? [];
}
