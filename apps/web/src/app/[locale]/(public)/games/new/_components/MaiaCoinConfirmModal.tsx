'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

type Props = {
  isOpen: boolean;
  /** Per-game Maia coin cost. */
  cost: number;
  /** The viewer's current spendable (confirmed) coin balance. */
  spendableBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirms the per-game coin charge before a viewer starts a Maia game.
 * Shown on every Maia start below `MAIA_FREE_LEVEL`; a free-tier start
 * and the non-Maia engines never reach it.
 */
export function MaiaCoinConfirmModal({
  isOpen,
  cost,
  spendableBalance,
  onConfirm,
  onCancel,
}: Props) {
  const t = useTranslations('newGame.maiaCoinConfirmModal');

  return (
    <ConfirmationModal
      isOpen={isOpen}
      title={t('title')}
      message={t('body', { cost })}
      confirmText={t('confirm')}
      cancelText={t('cancel')}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p className="mt-2 text-sm text-muted-foreground">
        {t('balance', { balance: spendableBalance })}
      </p>
    </ConfirmationModal>
  );
}
