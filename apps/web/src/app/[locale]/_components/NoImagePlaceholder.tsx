/**
 * Fallback shown in a board-thumbnail slot when a tag (typically a themeless
 * abstract concept) has no example position. Locale-agnostic on purpose — the
 * copy is short, universally understood, and not worth a per-locale split.
 * Every tag card surface renders it through the shared `TagCardContent`;
 * `TagPicker`'s suggestion rows use it directly at their compact size.
 */
export const NO_IMAGE_LABEL = 'No Image';

type Props = {
  /** Sizing (and any layout) classes for the slot, e.g. `w-16 h-16 shrink-0`. */
  className?: string;
};

export function NoImagePlaceholder({ className = '' }: Props) {
  return (
    <span
      className={`flex items-center justify-center rounded-sm border border-dashed border-border bg-muted/30 px-1 text-center text-[11px] leading-tight text-muted-foreground ${className}`}
    >
      {NO_IMAGE_LABEL}
    </span>
  );
}
