'use client';

import { LuSettings } from 'react-icons/lu';

type ArticleFormTopBarLabels = {
  metadata: string;
  saveDraft: string;
  savingDraft: string;
  savePublished: string;
  savingPublished: string;
  preview: string;
  cancel: string;
};

type ArticleFormTopBarProps = {
  labels: ArticleFormTopBarLabels;
  isPending: boolean;
  isPublished: boolean;
  onToggleMetadata: () => void;
  onSave: () => void;
  onPublishSettings: () => void;
  onCancel: () => void;
};

export function ArticleFormTopBar({
  labels,
  isPending,
  isPublished,
  onToggleMetadata,
  onSave,
  onPublishSettings,
  onCancel,
}: ArticleFormTopBarProps) {
  const saveLabel = isPending
    ? isPublished
      ? labels.savingPublished
      : labels.savingDraft
    : isPublished
      ? labels.savePublished
      : labels.saveDraft;

  return (
    <div className="flex items-center justify-end border-b border-border px-4 py-2 shrink-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMetadata}
          className="p-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
          title={labels.metadata}
        >
          <LuSettings size={16} />
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="px-4 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onPublishSettings}
          disabled={isPending}
          className="px-4 py-1.5 text-sm rounded bg-card border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          {labels.preview}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-1.5 text-sm rounded bg-card border border-border hover:bg-secondary transition-colors"
        >
          {labels.cancel}
        </button>
      </div>
    </div>
  );
}
