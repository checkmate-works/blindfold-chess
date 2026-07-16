import type { ReactNode } from 'react';

type AdminFormTopBarLabels = {
  saveDraft: string;
  savingDraft: string;
  savePublished: string;
  savingPublished: string;
  preview: string;
  cancel: string;
};

type AdminFormTopBarProps = {
  labels: AdminFormTopBarLabels;
  isPending: boolean;
  /** Switches the save button between its draft and published label pair. */
  isPublished: boolean;
  onSave: () => void;
  onPreview: () => void;
  onCancel: () => void;
  /** Extra buttons rendered before the save button (e.g. a metadata toggle). */
  leadingActions?: ReactNode;
};

/**
 * The save / preview / cancel bar pinned above the full-height admin editors
 * (articles, announcements). Pure presentational (no hooks); the compact
 * `py-1.5` buttons are deliberate — the bar is denser than the shared form
 * `Button`.
 */
export function AdminFormTopBar({
  labels,
  isPending,
  isPublished,
  onSave,
  onPreview,
  onCancel,
  leadingActions,
}: AdminFormTopBarProps) {
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
        {leadingActions}

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
