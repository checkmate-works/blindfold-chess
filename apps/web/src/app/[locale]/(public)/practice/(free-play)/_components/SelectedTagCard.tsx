'use client';

import { TagCardContent } from '@/app/[locale]/_components/TagCardContent';

type Props = {
  kind: 'theme' | 'chunk';
  label: string;
  previewFen: string | null;
  /** Short definition (theme) / description (chunk) snippet, clamped to two
   * lines — rendered by the shared `TagCardContent`. */
  description: string | null;
  badgeText: string;
  disabled: boolean;
  openDetailLabel: string;
  removeLabel: string;
  onOpen: () => void;
  onRemove: () => void;
};

/**
 * Selected-tag card shown in the position step's `TagPicker`. Renders the
 * shared `TagCardContent` (same inner markup as the detail pages'
 * `RelatedTagCard`) inside an interactive shell, so the two surfaces cannot
 * drift apart visually — including the "No Image" fallback for board-less
 * tags.
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
        <TagCardContent
          kind={kind}
          previewFen={previewFen}
          label={label}
          description={description}
          badgeText={badgeText}
        />
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
