'use client';

type AnnouncementFormTopBarLabels = {
  saveDraft: string;
  savingDraft: string;
  savePublished: string;
  savingPublished: string;
  preview: string;
  cancel: string;
};

type AnnouncementFormTopBarProps = {
  labels: AnnouncementFormTopBarLabels;
  isPending: boolean;
  isPublished: boolean;
  onSave: () => void;
  onPreview: () => void;
  onCancel: () => void;
};

export function AnnouncementFormTopBar({
  labels,
  isPending,
  isPublished,
  onSave,
  onPreview,
  onCancel,
}: AnnouncementFormTopBarProps) {
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
          onClick={onSave}
          disabled={isPending}
          className="px-4 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onPreview}
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
