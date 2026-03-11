import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

type Props = {
  selectedGameIds: Set<string>;
  onDelete: (gameIdsToDelete: string[]) => Promise<void>;
  isProcessing: boolean;
};

export function BulkDeleteActions({ selectedGameIds, onDelete, isProcessing }: Props) {
  const t = useTranslations('bulkDelete');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleDeleteClick = () => {
    if (selectedGameIds.size === 0) return;
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsConfirmOpen(false);
    await onDelete(Array.from(selectedGameIds));
  };

  return (
    <div className="space-y-6">
      {/* Selection Info */}
      {selectedGameIds.size > 0 && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-sm text-foreground">
            {t('selectedCount', { count: selectedGameIds.size })}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="destructive"
          size="lg"
          onClick={handleDeleteClick}
          disabled={selectedGameIds.size === 0 || isProcessing}
          loading={isProcessing}
          className="w-full"
        >
          {t('delete')}
        </Button>
      </div>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        title={t('confirmTitle')}
        message={t('confirmMessage', { count: selectedGameIds.size })}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        isLoading={isProcessing}
      />
    </div>
  );
}
