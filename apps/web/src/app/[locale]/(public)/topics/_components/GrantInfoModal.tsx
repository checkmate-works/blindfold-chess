'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

type Props = {
  open: boolean;
  durationDays: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function GrantInfoModal({ open, durationDays, onConfirm, onCancel }: Props) {
  const t = useTranslations('topics.grantInfoModal');

  return (
    <ConfirmationModal
      isOpen={open}
      title={t('title')}
      confirmText={t('confirm')}
      cancelText={t('cancel')}
      confirmVariant="primary"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p className="text-muted-foreground leading-relaxed">{t('body', { days: durationDays })}</p>
      <p className="text-muted-foreground text-sm mt-2">{t('note')}</p>
    </ConfirmationModal>
  );
}
