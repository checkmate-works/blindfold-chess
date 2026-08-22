import { cache } from 'react';

import { unstable_cache } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import { profileCacheTag } from '@/lib/cache-tags';
import { AUTHOR_PROFILE_COLUMNS, db, profiles } from '@/lib/db';

/**
 * The public profile row, behind the Data Cache under a per-username tag.
 *
 * @design Why this read is cached
 * `/u/[username]` and its archive sub-pages are dynamic, and every render
 * starts with this lookup — the two `problems` archives are the pages a
 * crawler hits hardest, and each of their renders fires this SELECT plus the
 * shell's aggregates in parallel. The session pooler's connection budget is shared
 * across every warm instance, so that fan-out is what put a sweep (and, once,
 * a single human on two profiles) at the pool ceiling with
 * `EMAXCONNSESSION` (Sentry BLINDFOLD-CHESS-5H, 2026-08-18 / -08-22).
 *
 * A profile row changes only when its owner edits it, so an hour of staleness
 * is not the freshness bound that matters: every writer of `profiles` expires
 * {@link profileCacheTag} for the row it touched, which is what makes an edit
 * visible on the next render. The list of those writers is in that tag's
 * TSDoc — adding a new one without the `revalidateTag` is the way this goes
 * wrong.
 *
 * A miss is cached too, deliberately: a crawler walking made-up usernames
 * would otherwise cost one connection per 404. `setUsername` expires the tag
 * on the INSERT, so a name that gets registered after such a probe still
 * resolves immediately.
 *
 * The projection is all text columns — nothing here survives the Data Cache's
 * JSON round-trip as a different type. Keep it that way: adding a `Date`
 * column would silently hand callers a string.
 */
const loadProfileByUsername = (username: string) =>
  unstable_cache(
    async () => {
      const [profile] = await db
        .select({
          ...AUTHOR_PROFILE_COLUMNS,
          id: profiles.id,
          bio: profiles.bio,
          country: profiles.country,
          flair: profiles.flair,
          fideId: profiles.fideId,
          chesscomUsername: profiles.chesscomUsername,
          lichessUsername: profiles.lichessUsername,
          xUsername: profiles.xUsername,
          instagramUsername: profiles.instagramUsername,
          youtubeHandle: profiles.youtubeHandle,
        })
        .from(profiles)
        .where(and(eq(profiles.username, username), isNull(profiles.deletedAt)))
        .limit(1);

      return profile ?? null;
    },
    ['profile-by-username', username],
    { tags: [profileCacheTag(username)], revalidate: 3600 }
  )();

/**
 * Wrapped with `React.cache` so the metadata generator and the page
 * component can both call `getProfileByUsername(username)` without
 * re-entering the Data Cache twice per request.
 */
export const getProfileByUsername = cache(async (username: string) =>
  loadProfileByUsername(username)
);
