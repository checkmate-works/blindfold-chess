'use client';

import { useEffect, useState, useTransition } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MUTABLE_NOTIFICATION_TYPES } from '@/lib/notifications/mutable-types';
import type { MutableNotificationType } from '@/lib/notifications/mutable-types';

import { getNotificationMutes, setNotificationMute } from '../_actions';

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
        <p className="text-sm text-muted-foreground">{t('notifications.loading')}</p>
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
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    enabled ? 'bg-success' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
