import { cache } from 'react';

import { eq } from 'drizzle-orm';
import 'server-only';

import { db, profiles } from './db';

/**
 * Check if a user is banned by looking up their profile.
 * Returns `true` if the user has a non-null `bannedAt` timestamp.
 *
 * Wrapped with `React.cache` for per-request deduplication — multiple
 * callers within the same React server render pass share one DB query.
 */
export const isUserBanned = cache(async (userId: string): Promise<boolean> => {
  const [profile] = await db
    .select({ bannedAt: profiles.bannedAt })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return profile?.bannedAt != null;
});
