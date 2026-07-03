import { type SQL, and, eq, isNull } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { profiles } from './schema';

/**
 * Canonical author-profile columns selected alongside user-generated content.
 * Spread additional columns on top for callers that need more
 * (e.g. `{ ...AUTHOR_PROFILE_COLUMNS, country: profiles.country }`).
 */
export const AUTHOR_PROFILE_COLUMNS = {
  username: profiles.username,
  displayName: profiles.displayName,
  avatarUrl: profiles.avatarUrl,
};

/**
 * Join condition for attaching the author's profile to a content row while
 * excluding soft-deleted accounts. Use with a LEFT JOIN so content by deleted
 * authors still surfaces (with a null profile):
 *
 * `.leftJoin(profiles, liveProfileJoinOn(chunks.userId))`
 */
export function liveProfileJoinOn(ownerColumn: AnyPgColumn): SQL {
  return and(eq(ownerColumn, profiles.id), isNull(profiles.deletedAt)) as SQL;
}
