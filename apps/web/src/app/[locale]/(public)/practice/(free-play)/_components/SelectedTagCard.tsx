'use client';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

type Props = {
  kind: 'theme' | 'chunk';
  label: string;
  previewFen: string | null;
  badgeText: string;
  disabled: boolean;
  openDetailLabel: string;
  removeLabel: string;
  onOpen: () => void;
  onRemove: () => void;
};

/**
 * Card-style chip showing a selected tag with its preview board.
 * Click the body to open the detail modal; click the corner × to
 * detach. The two buttons are siblings (not nested) to satisfy the
 * "no button-in-button" HTML rule — the × is absolute-positioned
 * over the card via CSS, so a click on it dispatches only its own
 * handler and never reaches the card's onClick.
 */
export function SelectedTagCard({
  kind,
  label,
  previewFen,
  badgeText,
  disabled,
  openDetailLabel,
  removeLabel,
  onOpen,
  onRemove,
}: Props) {
  return (
    <li className="relative w-40">
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        aria-label={openDetailLabel}
        className="w-full p-2 rounded border border-border bg-card hover:bg-muted/40 transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-left"
      >
        <span aria-hidden className="w-32 h-32 flex items-center justify-center">
          {previewFen ? (
            <BoardThumbnail fen={previewFen} className="w-32 h-32" />
          ) : (
            <span className="w-32 h-32 rounded-sm border border-dashed border-border" />
          )}
        </span>
        <span className="w-full flex flex-col gap-1">
          <span
            className={`self-start text-[10px] uppercase tracking-wider rounded px-1 ${
              kind === 'theme'
                ? 'bg-primary/10 text-primary'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {badgeText}
          </span>
          <span className="text-sm text-foreground line-clamp-2 break-words">{label}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={removeLabel}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-card/80 border border-border text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors flex items-center justify-center text-sm leading-none disabled:opacity-30"
      >
        ×
      </button>
    </li>
  );
}
