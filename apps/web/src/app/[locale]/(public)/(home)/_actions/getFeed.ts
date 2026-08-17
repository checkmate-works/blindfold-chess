'use server';

import { getOptionalUser } from '@/lib/auth';

import { TOPICS_FEED_ENTITY_TYPES, getFeedData } from '../_lib/queries';
import type { FeedResponse } from '../_lib/types';

const DEFAULT_FEED_LIMIT = 10;
const MIN_FEED_LIMIT = 1;
const MAX_FEED_LIMIT = 50;

const FEED_SCOPES = ['home', 'topics'] as const;

/**
 * Feed scope selector. `'home'` fetches every entity type; `'topics'` scopes
 * the feed to discussion topics (see `TOPICS_FEED_ENTITY_TYPES`). The scope is
 * resolved to an entity-type whitelist server-side so the client cannot supply
 * an arbitrary filter.
 */
export type FeedScope = (typeof FEED_SCOPES)[number];

const SCOPE_ENTITY_TYPES: Record<FeedScope, readonly string[] | undefined> = {
  home: undefined,
  topics: TOPICS_FEED_ENTITY_TYPES,
};

/**
 * Narrow before looking up, mirroring `parseProfileFeedFilter` on the profile
 * timeline. This is a Server Action, so `scope` is whatever the request body
 * said: indexing the map directly walked the prototype chain, and a scope of
 * `'constructor'` resolved to a truthy non-iterable that threw on spread —
 * the same crafted-request 500 as an unclamped `limit`. Unknown scopes fall
 * back to the unfiltered home feed.
 */
function resolveScopeEntityTypes(scope: string): readonly string[] | undefined {
  return FEED_SCOPES.includes(scope as FeedScope)
    ? SCOPE_ENTITY_TYPES[scope as FeedScope]
    : undefined;
}

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

  const user = await getOptionalUser();

  return getFeedData({
    cursor,
    limit: safeLimit,
    currentUserId: user?.id,
    entityTypes: resolveScopeEntityTypes(scope),
  });
}
