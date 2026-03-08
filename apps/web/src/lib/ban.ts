import { eq } from 'drizzle-orm';
import 'server-only';

import { db, profiles } from './db';

/**
 * Check if a user is banned by looking up their profile.
 * Returns `true` if the user has a non-null `bannedAt` timestamp.
 */
export async function isUserBanned(userId: string): Promise<boolean> {
  const [profile] = await db
    .select({ bannedAt: profiles.bannedAt })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return profile?.bannedAt != null;
}
