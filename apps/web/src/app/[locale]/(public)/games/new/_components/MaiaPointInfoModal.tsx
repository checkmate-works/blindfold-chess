'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { Modal } from '@/app/[locale]/_components/Modal';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Per-game Maia point cost. */
  cost: number;
  /** The viewer's current spendable (confirmed) point balance. */
  spendableBalance: number;
  locale: Locale;
};

/**
 * Explains the per-game Maia point cost when a non-exempt viewer cannot
 * afford a game. Opened from two places, both meaning "not enough points":
 *   1. Tapping the locked Maia card in the engine selector.
 *   2. A start attempt that fails the balance check server-side.
 */
export function MaiaPointInfoModal({ isOpen, onClose, cost, spendableBalance, locale }: Props) {
  const t = useTranslations('newGame.maiaPointModal');
  const router = useRouter();

  return (
    <Modal isOpen={isOpen} title={t('title')} onClose={onClose} maxWidth="max-w-md" trapFocus>
      <div className="space-y-4">
        <p className="text-foreground">{t('body', { cost })}</p>
        <p className="text-sm text-muted-foreground">
          {t('balance', { balance: spendableBalance })}
        </p>
        <p className="text-sm text-muted-foreground">{t('earnHint')}</p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            {t('close')}
          </Button>
          <Button variant="primary" onClick={() => router.push(`/${locale}/mypage/points`)}>
            {t('viewPoints')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
