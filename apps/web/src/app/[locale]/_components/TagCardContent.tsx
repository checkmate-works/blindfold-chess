import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import { NoImagePlaceholder } from '@/app/[locale]/_components/NoImagePlaceholder';

type Props = {
  kind: 'theme' | 'chunk';
  /**
   * `null` only on theme rows for abstract concepts that have no
   * canonical example position. Chunks always carry a representative
   * FEN, so chunk callers pass that value here.
   */
  previewFen: string | null;
  label: string;
  description: string | null;
  badgeText: string;
  /**
   * Extra classes on the text body — e.g. `pr-7` to reserve space for an
   * overlapping corner control when the wrapper can't pad itself.
   */
  bodyClassName?: string;
};

/**
 * Shared inner content of every tag card surface: a themed board thumbnail
 * (or the "No Image" placeholder when the tag has no example position) next
 * to the kind badge, label, and a two-line description snippet.
 *
 * This is the single source of truth for the thumbnail fallback rule —
 * board-less tags ALWAYS render {@link NoImagePlaceholder}, on every screen.
 * Wrappers ({@link RelatedTagCard}, `SelectedTagCard`, `ChunkDiffCard`,
 * `ChunkRefLink`) only decide the interactive shell (link / button / static)
 * and must not reimplement this markup, so the surfaces can't drift apart.
 *
 * Uses `<span>` elements only (no `div`/`p`) so the content is valid
 * phrasing content inside both `<a>` and `<button>` shells.
 */
export function TagCardContent({
  kind,
  previewFen,
  label,
  description,
  badgeText,
  bodyClassName = '',
}: Props) {
  return (
    <>
      {previewFen ? (
        <ThemedBoardThumbnail fen={previewFen} className="w-16 h-16 shrink-0" />
      ) : (
        <NoImagePlaceholder className="w-16 h-16 shrink-0" />
      )}
      <span className={`min-w-0 flex-1 ${bodyClassName}`}>
        <span className="mb-0.5 flex items-center gap-2">
          <span
            className={`shrink-0 rounded px-1 text-[10px] uppercase tracking-wider ${
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
    </>
  );
}
