'use server';

import { revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { EXP_LEADERBOARD_CACHE_TAG, LEADERBOARD_CACHE_TAG } from '@/lib/cache-tags';
import { db, profiles } from '@/lib/db';
import { isMutableNotificationType } from '@/lib/notifications/mutable-types';
import type { MutableNotificationType } from '@/lib/notifications/mutable-types';
import { getMutedNotificationTypes, setNotificationTypeMuted } from '@/lib/notifications/mutes';

export async function getNotificationMutes(): Promise<MutableNotificationType[]> {
  const user = await getAuthenticatedUser();
  return getMutedNotificationTypes(user.id);
}

export async function setNotificationMute(type: string, muted: boolean): Promise<void> {
  const user = await getAuthenticatedUser();
  // Defensive runtime check: this action is callable directly over the
  // network, so a caller could send a `type` outside the union despite the
  // client only ever offering MUTABLE_NOTIFICATION_TYPES as toggles.
  if (!isMutableNotificationType(type)) return;

  await setNotificationTypeMuted(user.id, type, muted);
}

/** Whether the signed-in user has opted out of public leaderboards. */
export async function getLeaderboardVisibility(): Promise<boolean> {
  const user = await getAuthenticatedUser();
  const [row] = await db
    .select({ hiddenFromLeaderboard: profiles.hiddenFromLeaderboard })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  return row?.hiddenFromLeaderboard ?? false;
}

export async function setLeaderboardVisibility(hidden: boolean): Promise<void> {
  const user = await getAuthenticatedUser();
  await db.update(profiles).set({ hiddenFromLeaderboard: hidden }).where(eq(profiles.id, user.id));

  // Both ranking caches are tagged (60s TTL); purge them so opting out takes
  // effect on the next leaderboard view instead of up to a minute later.
  // Same expire profile as save-practice-result.ts, which purges these tags
  // on every challenge completion.
  revalidateTag(LEADERBOARD_CACHE_TAG, { expire: 0 });
  revalidateTag(EXP_LEADERBOARD_CACHE_TAG, { expire: 0 });
}
