'use server';

import { createClient } from '@/lib/supabase/server';

import { getFeedData } from '@/app/[locale]/(public)/(home)/_lib/queries';
import type { FeedResponse } from '@/app/[locale]/(public)/(home)/_lib/types';

import {
  parseProfileFeedFilter,
  resolveProfileFeedEntityTypes,
} from '../_lib/profile-feed-filters';

const PROFILE_FEED_LIMIT = 10;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Paginate one member's public profile timeline.
 *
 * @design Parameter order is bind order
 * `profileId` and `filter` come first so the page can hand FeedClient a
 * `getProfileFeed.bind(null, profileId, filter)` whose remaining parameter is
 * exactly the cursor FeedClient passes. That keeps the scope out of the
 * client's hands entirely — no inline action closure, and nothing for a
 * caller to get wrong by omitting.
 *
 * Both scope values are still validated here rather than trusted: a bound
 * argument travels through the client and comes back with the request. The
 * profile id is a public identifier (its profile is already on screen), so
 * the check is for shape only — a malformed value fails as an empty page
 * instead of a Postgres cast error — while `filter` is narrowed to the
 * server-side whitelist and never used as an entity-type list directly.
 *
 * Blocked viewers never reach this action: the profile page hides the timeline
 * behind its `restricted` branch, and the archive pages redirect. The action
 * itself intentionally does not re-check — a blocked viewer can already read
 * the same rows on the home feed and the public detail pages (blocking is
 * best-effort in-app hiding, not access control; see `toggleBlock`).
 */
export async function getProfileFeed(
  profileId: string,
  filter: string | undefined,
  cursor?: string
): Promise<FeedResponse> {
  if (!UUID_REGEX.test(profileId)) {
    return { items: [], nextCursor: null };
  }

  if (cursor && isNaN(new Date(cursor).getTime())) {
    return { items: [], nextCursor: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return getFeedData({
    cursor,
    limit: PROFILE_FEED_LIMIT,
    currentUserId: user?.id,
    entityTypes: resolveProfileFeedEntityTypes(parseProfileFeedFilter(filter)),
    actorId: profileId,
  });
}
