'use server';

// eslint-disable-next-line no-restricted-imports -- FollowButton (/u/[username]) and FollowingList (/mypage/following) update via useOptimistic and never router.refresh(); these revalidates are what re-render the server-owned follow state (follower count, list membership) on both surfaces
import { revalidatePath } from 'next/cache';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import { and, eq } from 'drizzle-orm';

import { authenticateGuardAndRequireProfile } from '@/lib/auth';
import { db, userFollows } from '@/lib/db';
import { toggleByInsert } from '@/lib/db/toggle-by-insert';
import { assertNotBlocked } from '@/lib/moderation/block';
import { createNotification } from '@/lib/notifications/notification';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

import { findLiveProfileIdByUsername } from '../_lib/queries';

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

  const targetProfileId = await findLiveProfileIdByUsername(targetUsername);

  if (!targetProfileId) {
    return { error: 'userNotFound' };
  }

  if (targetProfileId === user.id) {
    return { error: 'cannotFollowSelf' };
  }

  // A block (either direction) severs the follow graph and bars re-following.
  // Since blocking deletes any existing follow row, the only reachable toggle
  // here would be a fresh follow — reject it outright.
  const blocked = await assertNotBlocked(user.id, targetProfileId);
  if (blocked) return blocked;

  const following = await toggleByInsert(
    () => db.insert(userFollows).values({ followerId: user.id, followingId: targetProfileId }),
    () =>
      db
        .delete(userFollows)
        .where(
          and(eq(userFollows.followerId, user.id), eq(userFollows.followingId, targetProfileId))
        )
  );

  logActivityEvent({
    userId: user.id,
    action: following ? 'follow' : 'unfollow',
    targetType: 'user',
    targetId: targetProfileId,
  });

  if (following) {
    createNotification({
      userId: targetProfileId,
      actorId: user.id,
      type: 'follow',
      targetType: 'user',
      targetId: targetProfileId,
    });
  }

  revalidatePath(`/${locale}/u/${targetUsername}`);
  revalidatePath(`/${locale}/mypage/following`);

  return { following };
}
