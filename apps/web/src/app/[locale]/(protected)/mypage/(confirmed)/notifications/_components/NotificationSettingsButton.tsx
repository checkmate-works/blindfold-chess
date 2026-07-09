'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiSettings } from 'react-icons/fi';

import { MUTABLE_NOTIFICATION_TYPES } from '@/lib/notifications/mutable-types';
import type { MutableNotificationType } from '@/lib/notifications/mutable-types';

import { Modal } from '@/app/[locale]/_components/Modal';

import { setNotificationMute } from '../_actions';

type Props = {
  initialMutedTypes: MutableNotificationType[];
};

export function NotificationSettingsButton({ initialMutedTypes }: Props) {
  const t = useTranslations('MypageNotifications');
  const [isOpen, setIsOpen] = useState(false);
  const [mutedTypes, setMutedTypes] = useState<Set<MutableNotificationType>>(
    new Set(initialMutedTypes)
  );
  const [, startTransition] = useTransition();

  function toggle(type: MutableNotificationType) {
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
    <>
      <Button
        variant="outline"
        size="sm"
        icon={<FiSettings className="h-4 w-4" />}
        onClick={() => setIsOpen(true)}
      >
        {t('settings.button')}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('settings.title')}
        maxWidth="max-w-md"
      >
        <p className="mb-4 text-sm text-muted-foreground">{t('settings.description')}</p>
        <ul className="divide-y divide-border">
          {MUTABLE_NOTIFICATION_TYPES.map((type) => {
            const enabled = !mutedTypes.has(type);
            return (
              <li key={type} className="flex items-center justify-between gap-3 py-3">
                <span className="text-sm text-foreground">{t(`settings.types.${type}`)}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={t(`settings.types.${type}`)}
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
      </Modal>
    </>
  );
}
