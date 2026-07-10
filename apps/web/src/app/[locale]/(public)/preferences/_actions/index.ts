'use server';

import { getAuthenticatedUser } from '@/lib/auth';
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
