'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import { db, follows, profiles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { validateUsername } from '@/lib/username';

type ToggleFollowResult = { following: boolean } | { error: string };

export async function toggleFollow(
  targetUsername: string,
  locale: string
): Promise<ToggleFollowResult> {
  if (validateUsername(targetUsername) !== null) {
    return { error: 'invalidUsername' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'signInRequired' };
  }

  // Look up the target user's profile by username
  const [targetProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.username, targetUsername), isNull(profiles.deletedAt)))
    .limit(1);

  if (!targetProfile) {
    return { error: 'userNotFound' };
  }

  if (targetProfile.id === user.id) {
    return { error: 'cannotFollowSelf' };
  }

  // INSERT-first pattern: attempt to insert, catch unique violation to toggle.
  // This avoids the race condition of SELECT-then-INSERT.
  let following: boolean;
  try {
    await db.insert(follows).values({
      followerId: user.id,
      followingId: targetProfile.id,
    });
    following = true;
  } catch (err: unknown) {
    // Drizzle wraps the original PostgresError in a "Failed query" error.
    // The unique violation code '23505' is on the cause, not the outer error.
    const cause = err instanceof Error && err.cause;
    const isUniqueViolation =
      cause instanceof Error && 'code' in cause && (cause as { code: string }).code === '23505';
    if (!isUniqueViolation) {
      throw err;
    }
    // Already following — unfollow
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetProfile.id)));
    following = false;
  }

  revalidatePath(`/${locale}/@/${targetUsername}`);

  return { following };
}
