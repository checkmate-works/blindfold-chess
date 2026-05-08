import type { SupabaseClient, User } from '@supabase/supabase-js';

import { createAdminClient } from './admin';

const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_MAX_PAGES = 100;

/**
 * Walk Supabase Auth `admin.listUsers` until exhausted and return every
 * page concatenated.
 *
 * Used by admin-side aggregations that need the full user list — the
 * KPI dashboard (which buckets `created_at` per day) and the
 * `/admin/users` filter view (which filters in JS because the Supabase
 * Admin API has no date-range or attribute filtering). Sharing this
 * paginator keeps the page-size, max-page guard, and error-handling
 * choices in one place.
 *
 * Throws when a page returns an `error` rather than silently truncating
 * to the pages already fetched.
 *
 * The defaults (1000 per page, up to 100 pages = ~100k users) are sized
 * for the current production scale; if the user count outgrows them this
 * helper is the single place to revisit.
 */
export async function listAllAuthUsers(
  adminClient: SupabaseClient = createAdminClient(),
  options?: { pageSize?: number; maxPages?: number }
): Promise<User[]> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES;

  const allUsers: User[] = [];
  let page = 1;

  while (page <= maxPages) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: pageSize });

    if (error) {
      throw new Error(`Failed to fetch users (page ${page}): ${error.message}`);
    }

    const users = data?.users ?? [];
    allUsers.push(...users);

    if (users.length < pageSize) break;
    page++;
  }

  return allUsers;
}
