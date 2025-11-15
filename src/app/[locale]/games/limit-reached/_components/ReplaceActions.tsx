'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

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
  const t = useTranslations('home.manageLimit');

  const handleDeleteAndSave = async () => {
    if (selectedGameIds.size === 0) return;
    await onDeleteAndSave(Array.from(selectedGameIds));
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
          onClick={handleDeleteAndSave}
          disabled={selectedGameIds.size === 0 || isProcessing}
          variant="primary"
          size="lg"
          icon={isProcessing ? <span className="animate-spin">⏳</span> : undefined}
          className="flex-1 font-medium"
        >
          {isProcessing ? t('processing') : t('deleteAndSave')}
        </Button>
        <Button
          onClick={onSkipSave}
          disabled={isProcessing}
          variant="secondary"
          size="lg"
          className="sm:w-auto bg-white dark:bg-white text-black hover:bg-gray-100 dark:hover:bg-gray-100 font-medium"
        >
          {t('skipSave')}
        </Button>
      </div>
    </div>
  );
}
