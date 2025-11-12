'use client';

import { useTranslations } from 'next-intl';

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
        <button
          onClick={handleDeleteAndSave}
          disabled={selectedGameIds.size === 0 || isProcessing}
          className="flex-1 px-6 py-3 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <span className="animate-spin">⏳</span>
              {t('processing')}
            </>
          ) : (
            <>{t('deleteAndSave')}</>
          )}
        </button>
        <button
          onClick={onSkipSave}
          disabled={isProcessing}
          className="sm:w-auto px-6 py-3 bg-white dark:bg-white text-black border border-border rounded-md hover:bg-gray-100 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {t('skipSave')}
        </button>
      </div>
    </div>
  );
}
