'use client';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import { NoImagePlaceholder } from '@/app/[locale]/_components/NoImagePlaceholder';

type Props = {
  kind: 'theme' | 'chunk';
  label: string;
  previewFen: string | null;
  /** Short definition (theme) / description (chunk) snippet, clamped to two
   * lines — mirrors the authoring preview's `RelatedTagCard`. */
  description: string | null;
  badgeText: string;
  disabled: boolean;
  openDetailLabel: string;
  removeLabel: string;
  onOpen: () => void;
  onRemove: () => void;
};

/**
 * Selected-tag card shown in the position step's `TagPicker`. Matches the
 * authoring preview's `RelatedTagCard` shape — a horizontal row with a small
 * board thumbnail on the left and the badge + label on the right — so the two
 * surfaces read consistently. Board-less tags fall back to the shared
 * `NoImagePlaceholder`.
 *
 * Click the body to open the detail modal; click the corner × to detach. The
 * two buttons are siblings (not nested) to satisfy the "no button-in-button"
 * HTML rule — the × is absolute-positioned over the card via CSS, so a click
 * on it dispatches only its own handler and never reaches the card's onClick.
 * The body reserves right padding (`pr-9`) so its content never runs under the
 * × control.
 */
export function SelectedTagCard({
  kind,
  label,
  previewFen,
  description,
  badgeText,
  disabled,
  openDetailLabel,
  removeLabel,
  onOpen,
  onRemove,
}: Props) {
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        aria-label={openDetailLabel}
        className="flex w-full items-start gap-3 rounded border border-border bg-card p-3 pr-9 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {previewFen ? (
          <BoardThumbnail fen={previewFen} className="w-16 h-16 shrink-0" />
        ) : (
          <NoImagePlaceholder className="w-16 h-16 shrink-0" />
        )}
        <span className="min-w-0 flex-1">
          <span className="mb-0.5 flex items-center gap-2">
            <span
              className={`flex-shrink-0 rounded px-1 text-[10px] uppercase tracking-wider ${
                kind === 'theme'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {badgeText}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {label}
            </span>
          </span>
          {description && (
            <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={removeLabel}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card/80 text-sm leading-none text-muted-foreground transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-30"
      >
        ×
      </button>
    </li>
  );
}
