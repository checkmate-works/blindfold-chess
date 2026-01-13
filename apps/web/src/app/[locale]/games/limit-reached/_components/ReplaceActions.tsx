import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaSpinner } from 'react-icons/fa';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

type Props = {
  selectedGameIds: Set<string>;
  onDeleteAndSave: (gameIdsToDelete: string[]) => Promise<void>;
  onSkipSave: () => void;
  isProcessing: boolean;
};

export function ReplaceActions({
  selectedGameIds,
  onDeleteAndSave,
  onSkipSave,
  isProcessing,
}: Props) {
  const t = useTranslations('home');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSkipConfirmOpen, setIsSkipConfirmOpen] = useState(false);

  // Delete handlers
  const handleDeleteClick = () => {
    if (selectedGameIds.size === 0) return;
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteConfirmOpen(false);
    await onDeleteAndSave(Array.from(selectedGameIds));
  };

  // Skip handlers
  const handleSkipClick = () => {
    setIsSkipConfirmOpen(true);
  };

  const handleConfirmSkip = () => {
    setIsSkipConfirmOpen(false);
    onSkipSave();
  };

  return (
    <div className="space-y-6">
      {/* Selection Info */}
      {selectedGameIds.size > 0 && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-sm text-foreground">
            {t('manageLimit.selectedCount', { count: selectedGameIds.size })}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleDeleteClick}
          disabled={selectedGameIds.size === 0 || isProcessing}
          variant="primary"
          size="lg"
          icon={isProcessing ? <FaSpinner className="animate-spin" /> : undefined}
          className="flex-1 font-medium"
        >
          {isProcessing ? t('manageLimit.processing') : t('manageLimit.deleteAndSave')}
        </Button>
        <Button
          onClick={handleSkipClick}
          disabled={isProcessing}
          variant="destructive"
          size="lg"
          className="sm:w-auto font-medium"
        >
          {t('manageLimit.skipSave')}
        </Button>
      </div>

      {/* Confirmation Modal for Delete & Save */}
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        title={t('bulkDelete.confirmTitle')}
        message={t('bulkDelete.confirmMessage', { count: selectedGameIds.size })}
        confirmText={t('manageLimit.deleteAndSave')}
        cancelText={t('bulkDelete.cancel')}
        confirmVariant="primary"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        isLoading={isProcessing}
      />

      {/* Confirmation Modal for Skip Save */}
      <ConfirmationModal
        isOpen={isSkipConfirmOpen}
        title={t('manageLimit.confirmSkipTitle')}
        message={t('manageLimit.confirmSkipMessage')}
        confirmText={t('manageLimit.confirmSkipButton')}
        cancelText={t('bulkDelete.cancel')}
        confirmVariant="danger"
        onConfirm={handleConfirmSkip}
        onCancel={() => setIsSkipConfirmOpen(false)}
        isLoading={isProcessing}
      />
    </div>
  );
}
