'use client';

import { FiInfo } from 'react-icons/fi';

type Props = {
  /** "We restored your draft" line. */
  message: string;
  /** Label for the discard action. */
  discardLabel: string;
  /** Opens the caller's discard confirmation — never discards directly. */
  onDiscard: () => void;
};

/**
 * Notice shown when an authoring form hydrated itself from a saved draft,
 * with a way to throw that draft away and start over.
 *
 * The chunk and puzzle creation forms rendered this identically, down to the
 * i18n key names. It is `role="status"` with `aria-live="polite"` because the
 * form is already on screen when the draft loads — a screen-reader user needs
 * to be told the fields were pre-filled, but not interrupted for it.
 */
export function DraftRestoredBanner({ message, discardLabel, onDiscard }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary px-3 py-2 text-sm"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <FiInfo className="h-4 w-4 flex-shrink-0" aria-hidden />
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={onDiscard}
        className="rounded border border-destructive px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
      >
        {discardLabel}
      </button>
    </div>
  );
}
