'use server';

import { revalidatePath } from 'next/cache';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import { and, eq, isNull } from 'drizzle-orm';

import { authenticateGuardAndRequireProfile } from '@/lib/auth';
import { db, profiles, userFollows } from '@/lib/db';
import { toggleByInsert } from '@/lib/db/toggle-by-insert';
import { isBlockedBetween } from '@/lib/moderation/block';
import { createNotification } from '@/lib/notifications/notification';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

type ToggleFollowResult = { following: boolean } | { error: string };

export async function toggleFollow(
  targetUsername: string,
  locale: string
): Promise<ToggleFollowResult> {
  assertSupportedLocale(locale);

  const guardResult = await authenticateGuardAndRequireProfile(RATE_LIMITS.toggleFollow);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

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

  // A block (either direction) severs the follow graph and bars re-following.
  // Since blocking deletes any existing follow row, the only reachable toggle
  // here would be a fresh follow — reject it outright.
  if (await isBlockedBetween(user.id, targetProfile.id)) {
    return { error: 'blocked' };
  }

  const following = await toggleByInsert(
    () => db.insert(userFollows).values({ followerId: user.id, followingId: targetProfile.id }),
    () =>
      db
        .delete(userFollows)
        .where(
          and(eq(userFollows.followerId, user.id), eq(userFollows.followingId, targetProfile.id))
        )
  );

  logActivityEvent({
    userId: user.id,
    action: following ? 'follow' : 'unfollow',
    targetType: 'user',
    targetId: targetProfile.id,
  });

  if (following) {
    createNotification({
      userId: targetProfile.id,
      actorId: user.id,
      type: 'follow',
      targetType: 'user',
      targetId: targetProfile.id,
    });
  }

  revalidatePath(`/${locale}/u/${targetUsername}`);
  revalidatePath(`/${locale}/mypage/following`);

  return { following };
}
