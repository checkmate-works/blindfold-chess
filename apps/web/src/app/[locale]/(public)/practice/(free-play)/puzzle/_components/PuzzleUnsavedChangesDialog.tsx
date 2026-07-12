'use client';

import { useTranslations } from 'next-intl';

import { UnsavedChangesDialog } from '@/app/_components';

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * `UnsavedChangesDialog` pre-wired with the app-wide `unsavedChanges` labels —
 * every puzzle authoring step renders the same dialog, so the label plumbing
 * lives here once.
 */
export function PuzzleUnsavedChangesDialog({ open, onConfirm, onCancel }: Props) {
  const t = useTranslations('unsavedChanges');

  return (
    <UnsavedChangesDialog
      open={open}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title={t('title')}
      message={t('message')}
      confirmLabel={t('confirm')}
      cancelLabel={t('cancel')}
    />
  );
}
