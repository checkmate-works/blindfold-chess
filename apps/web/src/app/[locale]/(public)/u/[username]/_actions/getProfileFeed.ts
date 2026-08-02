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
 * `profileId` arrives from the client because `FeedClient` owns the cursor
 * loop; it is a public identifier (the profile it belongs to is already being
 * rendered) so no ownership check applies — but it is still shape-validated so
 * a malformed value fails as an empty page rather than as a Postgres cast
 * error. `filter` is likewise narrowed to the server-side whitelist, never
 * used as an entity-type list directly.
 *
 * Blocked viewers never reach this action: the profile page hides the timeline
 * behind its `restricted` branch, and the archive pages redirect. The action
 * itself intentionally does not re-check — a blocked viewer can already read
 * the same rows on the home feed and the public detail pages (blocking is
 * best-effort in-app hiding, not access control; see `toggleBlock`).
 */
export async function getProfileFeed(
  profileId: string,
  cursor?: string,
  filter?: string
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
