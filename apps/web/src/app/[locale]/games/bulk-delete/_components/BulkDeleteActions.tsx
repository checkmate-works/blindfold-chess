'use client';

import { useTranslations } from 'next-intl';

type Props = {
  selectedGameIds: Set<string>;
  onDelete: (gameIdsToDelete: string[]) => Promise<void>;
  onCancel: () => void;
  isProcessing: boolean;
};

export function BulkDeleteActions({ selectedGameIds, onDelete, onCancel, isProcessing }: Props) {
  const t = useTranslations('home.bulkDelete');

  const handleDelete = async () => {
    if (selectedGameIds.size === 0) return;
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
        <button
          onClick={handleDelete}
          disabled={selectedGameIds.size === 0 || isProcessing}
          className="flex-1 px-6 py-3 bg-red-600 dark:bg-red-600 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <span className="animate-spin">⏳</span>
              {t('processing')}
            </>
          ) : (
            <>{t('delete')}</>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="sm:w-auto px-6 py-3 bg-white dark:bg-white text-black border border-border rounded-md hover:bg-gray-100 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
