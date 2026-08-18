'use server';

import { getOptionalUser } from '@/lib/auth';
import { isValidUUID } from '@/lib/validations/uuid';

import { getFeedData } from '@/app/[locale]/(public)/(home)/_lib/queries';
import type { FeedResponse } from '@/app/[locale]/(public)/(home)/_lib/types';

const PROFILE_FEED_LIMIT = 10;

/**
 * Paginate one member's public profile timeline.
 *
 * @design Parameter order is bind order
 * `profileId` comes first so the page can hand FeedClient a
 * `getProfileFeed.bind(null, profileId)` whose remaining parameter is exactly
 * the cursor FeedClient passes. That keeps the scope out of the client's hands
 * entirely — no inline action closure, and nothing for a caller to get wrong
 * by omitting.
 *
 * The scope is still validated here rather than trusted: a bound argument
 * travels through the client and comes back with the request. The profile id
 * is a public identifier (its profile is already on screen), so the check is
 * for shape only — a malformed value fails as an empty page instead of a
 * Postgres cast error.
 *
 * Blocked viewers never reach this action: the profile page hides the timeline
 * behind its `restricted` branch, and the archive pages redirect. The action
 * itself intentionally does not re-check — a blocked viewer can already read
 * the same rows on the home feed and the public detail pages (blocking is
 * best-effort in-app hiding, not access control; see `toggleBlock`).
 */
export async function getProfileFeed(profileId: string, cursor?: string): Promise<FeedResponse> {
  if (!isValidUUID(profileId)) {
    return { items: [], nextCursor: null };
  }

  if (cursor && isNaN(new Date(cursor).getTime())) {
    return { items: [], nextCursor: null };
  }

  const user = await getOptionalUser();

  return getFeedData({
    actorId: profileId,
    currentUserId: user?.id,
    limit: PROFILE_FEED_LIMIT,
    cursor,
  });
}
