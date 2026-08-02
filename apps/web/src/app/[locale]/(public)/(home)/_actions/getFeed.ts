'use server';

import { createClient } from '@/lib/supabase/server';

import { TOPICS_FEED_ENTITY_TYPES, getFeedData } from '../_lib/queries';
import type { FeedResponse } from '../_lib/types';

const DEFAULT_FEED_LIMIT = 10;
const MIN_FEED_LIMIT = 1;
const MAX_FEED_LIMIT = 50;

/**
 * Feed scope selector. `'home'` fetches every entity type; `'topics'` scopes
 * the feed to discussion topics (see `TOPICS_FEED_ENTITY_TYPES`). The scope is
 * resolved to an entity-type whitelist server-side so the client cannot supply
 * an arbitrary filter.
 */
export type FeedScope = 'home' | 'topics';

const SCOPE_ENTITY_TYPES: Record<FeedScope, readonly string[] | undefined> = {
  home: undefined,
  topics: TOPICS_FEED_ENTITY_TYPES,
};

export async function getFeed(
  cursor?: string,
  limit?: number,
  scope: FeedScope = 'home'
): Promise<FeedResponse> {
  if (cursor && isNaN(new Date(cursor).getTime())) {
    return { items: [], nextCursor: null };
  }

  // Clamped at BOTH ends, and to a whole number. This is a Server Action, so
  // `limit` is whatever the request body said — not what `FeedClient` passes.
  // A ceiling alone let a negative value through to `LIMIT -N`, which Postgres
  // rejects, turning a crafted request into a 500; a fractional or NaN value
  // reached the driver just as unchecked.
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit as number), MIN_FEED_LIMIT), MAX_FEED_LIMIT)
    : DEFAULT_FEED_LIMIT;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return getFeedData({
    cursor,
    limit: safeLimit,
    currentUserId: user?.id,
    entityTypes: SCOPE_ENTITY_TYPES[scope],
  });
}
