'use client';

import { useRouter } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
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
 * Explains the per-game Maia coin cost when a viewer cannot afford a
 * game. Opened from two places, both meaning "not enough coins":
 *   1. Tapping the locked Maia card in the engine selector.
 *   2. A start attempt that fails the balance check server-side.
 *
 * Built on `ConfirmationModal` so its action row is the one every confirm
 * dialog shares — same order, same stacking on a phone, same 12px gap and
 * 44px targets. It used to hand-roll the same row with an 8px gap.
 */
export function MaiaPointInfoModal({ isOpen, onClose, cost, spendableBalance, locale }: Props) {
  const t = useTranslations('newGame.maiaPointModal');
  const router = useRouter();

  return (
    <ConfirmationModal
      isOpen={isOpen}
      title={t('title')}
      message={t('body', { cost })}
      confirmText={t('viewPoints')}
      cancelText={t('close')}
      onConfirm={() => router.push(`/${locale}/mypage/coins`)}
      onCancel={onClose}
      trapFocus
    >
      <p className="mt-4 text-sm text-muted-foreground">
        {t('balance', { balance: spendableBalance })}
      </p>
      <Link
        href="/coin"
        locale={locale}
        className={`mt-4 inline-block text-sm ${TEXT_LINK_MUTED_CLASSES}`}
      >
        {t('earnLink')}
      </Link>
    </ConfirmationModal>
  );
}
