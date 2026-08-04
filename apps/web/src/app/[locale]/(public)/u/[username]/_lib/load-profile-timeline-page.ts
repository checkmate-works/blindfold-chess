import { getFeedData } from '@/app/[locale]/(public)/(home)/_lib/queries';
import type { FeedResponse } from '@/app/[locale]/(public)/(home)/_lib/types';

/**
 * How many all-holes pages to walk past before handing what is left to the
 * caller. Bounded so one request cannot turn into an unbounded scan of a
 * member who deleted thousands of items; the cursor survives, so the client's
 * infinite scroll picks up where this stopped.
 */
const MAX_SKIPPED_PAGES = 5;

/**
 * One page of a member's profile timeline, skipping pages that came back with
 * nothing renderable.
 *
 * @design Why the skip exists
 * `feed_items` rows are never removed when their source entity goes away — a
 * soft-deleted post, position or chunk, or a game switched back to private,
 * leaves its row behind, and `getFeedData` drops it while still counting it
 * against the page limit. A run of such rows therefore yields a page with zero
 * items but a perfectly good `nextCursor`. Around a quarter of the rows in a
 * seeded database are already in this state, and they cluster (a member
 * deletes several things at once), so "the whole page is holes" is a normal
 * outcome, not a corner case.
 *
 * The home feed absorbs this implicitly: it hands the empty page straight to
 * `FeedClient`, whose sentinel is still on screen, so the browser immediately
 * asks for the next one. The profile timeline cannot, because it has to decide
 * *server-side* whether to render its empty state — and an empty page there
 * used to be read as "this member has no activity", hiding everything older
 * than the deleted run. Skipping here keeps that decision honest: an empty
 * result from this function means the cursor is exhausted too.
 */
export async function loadProfileTimelinePage({
  profileId,
  currentUserId,
  limit,
  cursor,
}: {
  profileId: string;
  /** The viewer, for `likedByMe` and other per-viewer meta. */
  currentUserId: string | undefined;
  limit: number;
  cursor?: string;
}): Promise<FeedResponse> {
  let nextCursor = cursor;

  for (let skipped = 0; ; skipped++) {
    const page: FeedResponse = await getFeedData({
      cursor: nextCursor,
      limit,
      currentUserId,
      actorId: profileId,
    });

    if (page.items.length > 0 || page.nextCursor === null || skipped >= MAX_SKIPPED_PAGES) {
      return page;
    }

    nextCursor = page.nextCursor;
  }
}
