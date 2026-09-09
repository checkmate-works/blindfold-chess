'use server';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import { and, eq, or } from 'drizzle-orm';

import { authenticateGuardAndRequireProfile } from '@/lib/auth';
import { db, userBlocks, userFollows } from '@/lib/db';
import { toggleByInsert } from '@/lib/db/toggle-by-insert';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

import { findLiveProfileIdByUsername } from '../_lib/queries';

type ToggleBlockResult = { blocked: boolean } | { error: string };

export async function toggleBlock(
  targetUsername: string,
  locale: string
): Promise<ToggleBlockResult> {
  assertSupportedLocale(locale);

  const guardResult = await authenticateGuardAndRequireProfile(RATE_LIMITS.toggleBlock);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const targetProfileId = await findLiveProfileIdByUsername(targetUsername);

  if (!targetProfileId) {
    return { error: 'userNotFound' };
  }

  if (targetProfileId === user.id) {
    return { error: 'cannotBlockSelf' };
  }

  const blocked = await toggleByInsert(
    () => db.insert(userBlocks).values({ blockerId: user.id, blockedId: targetProfileId }),
    () =>
      db
        .delete(userBlocks)
        .where(and(eq(userBlocks.blockerId, user.id), eq(userBlocks.blockedId, targetProfileId)))
  );

  // Blocking severs the follow graph in BOTH directions: you no longer follow
  // them, and they no longer follow you.
  if (blocked) {
    await db
      .delete(userFollows)
      .where(
        or(
          and(eq(userFollows.followerId, user.id), eq(userFollows.followingId, targetProfileId)),
          and(eq(userFollows.followerId, targetProfileId), eq(userFollows.followingId, user.id))
        )
      );
  }

  logActivityEvent({
    userId: user.id,
    action: blocked ? 'block' : 'unblock',
    targetType: 'user',
    targetId: targetProfileId,
  });

  // No revalidatePath: all three routes are dynamic, and `BlockActions` calls
  // `router.refresh()` on success for the page the user is actually on.

  return { blocked };
}
