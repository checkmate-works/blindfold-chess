'use client';

import { useTranslations } from 'next-intl';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

type Props = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * The "continuing will clear the solution moves you've entered" confirmation
 * shown by both position forms when the board position changed under
 * carried-through moves (see `usePuzzlePositionStep`).
 */
export function PositionChangedModal({ isOpen, onConfirm, onCancel }: Props) {
  const t = useTranslations('practice.puzzle.create');

  return (
    <ConfirmationModal
      isOpen={isOpen}
      title={t('positionChangedConfirmTitle')}
      message={t('positionChangedConfirmMessage')}
      confirmText={t('positionChangedConfirmConfirm')}
      cancelText={t('positionChangedConfirmCancel')}
      confirmVariant="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
