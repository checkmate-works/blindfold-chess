'use client';

import { useEffect, useState, useTransition } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MUTABLE_NOTIFICATION_TYPES } from '@/lib/notifications/mutable-types';
import type { MutableNotificationType } from '@/lib/notifications/mutable-types';

import { Skeleton } from '@/app/[locale]/_components/Skeleton';
import {
  toggleKnobClass,
  toggleTrackClass,
} from '@/app/[locale]/_components/toggle-switch-classes';

import { getNotificationMutes, setNotificationMute } from '../_actions';

/**
 * Shaped identically to the real `<li>` rows below (same `py-3` height, same
 * `h-5 w-9` switch footprint) so nothing shifts once `getNotificationMutes`
 * resolves and the real list replaces this.
 */
function NotificationSettingsSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {MUTABLE_NOTIFICATION_TYPES.map((type) => (
        <li key={type} className="flex items-center justify-between gap-3 py-3">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

export function NotificationSettings() {
  const t = useTranslations('Preferences');
  // null = still loading the current mute list; Set = loaded.
  const [mutedTypes, setMutedTypes] = useState<Set<MutableNotificationType> | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getNotificationMutes().then((types) => {
      if (!cancelled) setMutedTypes(new Set(types));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(type: MutableNotificationType) {
    if (!mutedTypes) return;
    const isCurrentlyMuted = mutedTypes.has(type);
    const next = new Set(mutedTypes);
    if (isCurrentlyMuted) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setMutedTypes(next);

    startTransition(async () => {
      await setNotificationMute(type, !isCurrentlyMuted);
    });
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">{t('notifications.description')}</p>
      {mutedTypes === null ? (
        <NotificationSettingsSkeleton />
      ) : (
        <ul className="divide-y divide-border">
          {MUTABLE_NOTIFICATION_TYPES.map((type) => {
            const enabled = !mutedTypes.has(type);
            return (
              <li key={type} className="flex items-center justify-between gap-3 py-3">
                <span className="text-sm text-foreground">{t(`notifications.types.${type}`)}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={t(`notifications.types.${type}`)}
                  onClick={() => toggle(type)}
                  className={`${toggleTrackClass('setting', enabled)} shrink-0`}
                >
                  <span className={toggleKnobClass('setting', enabled)} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
