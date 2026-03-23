'use server';

import { createClient } from '@/lib/supabase/server';

import { getFeedData } from '../_lib/queries';
import type { FeedResponse } from '../_lib/types';

const DEFAULT_FEED_LIMIT = 10;
const MAX_FEED_LIMIT = 50;

export async function getFeed(cursor?: string, limit?: number): Promise<FeedResponse> {
  if (cursor && isNaN(new Date(cursor).getTime())) {
    return { items: [], nextCursor: null };
  }

  const safeLimit = Math.min(limit ?? DEFAULT_FEED_LIMIT, MAX_FEED_LIMIT);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return getFeedData(cursor, safeLimit, user?.id);
}
