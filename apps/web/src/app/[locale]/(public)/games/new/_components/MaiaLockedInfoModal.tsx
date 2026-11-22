'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MAIA_UNLOCK_LEVEL } from '@/lib/users/maia-unlock-level';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** The viewer's current level, shown against the level that unlocks Maia. */
  level: number;
  locale: Locale;
};

/**
 * Explains why the Maia card is locked — the viewer is below
 * `MAIA_UNLOCK_LEVEL` — and points at the practice menu, where the Exp that
 * closes the gap is earned. Opened by tapping the locked Maia card in the
 * engine selector.
 *
 * Built on `ConfirmationModal` so its action row is the one every confirm
 * dialog shares — same order, same stacking on a phone, same 12px gap and
 * 44px targets.
 */
export function MaiaLockedInfoModal({ isOpen, onClose, level, locale }: Props) {
  const t = useTranslations('newGame.maiaLockedModal');
  const router = useRouter();

  return (
    <ConfirmationModal
      isOpen={isOpen}
      title={t('title', { level: MAIA_UNLOCK_LEVEL })}
      message={t('body', { level: MAIA_UNLOCK_LEVEL, current: level })}
      confirmText={t('practice')}
      cancelText={t('close')}
      onConfirm={() => router.push(`/${locale}/practice`)}
      onCancel={onClose}
      trapFocus
    />
  );
}
