import { type SQL, and, eq, isNull } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { profiles } from './schema';

/**
 * Canonical author-profile columns selected alongside user-generated content.
 * Spread additional columns on top for callers that need more
 * (e.g. `{ ...AUTHOR_PROFILE_COLUMNS, country: profiles.country }`).
 *
 * The row shape these produce is `AuthorProfile` in `@/lib/users/author-profile`
 * — declare results with that type rather than re-listing the three fields.
 */
export const AUTHOR_PROFILE_COLUMNS = {
  username: profiles.username,
  displayName: profiles.displayName,
  avatarUrl: profiles.avatarUrl,
};

/**
 * {@link AUTHOR_PROFILE_COLUMNS} plus the two chips rendered beside the name.
 * Selected by the surfaces that show an author socially — the topic and feed
 * cards, the rank-update actor.
 *
 * The row shape this produces is `SocialAuthorProfile` in
 * `@/lib/users/author-profile`; declare results with that type rather than
 * re-listing the five fields, which is how `country` and `flair` came to be
 * spelled out in five places after being added for one of them.
 */
export const SOCIAL_AUTHOR_COLUMNS = {
  ...AUTHOR_PROFILE_COLUMNS,
  flair: profiles.flair,
  country: profiles.country,
} as const;

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
