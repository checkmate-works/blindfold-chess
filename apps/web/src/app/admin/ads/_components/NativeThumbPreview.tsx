import type { NativeCardThumbnail } from '@/lib/ads/thumbnail';
import { CreativeThumbnail } from '@/lib/ads/ui/CreativeThumbnail';

type Props = {
  title: string;
  thumbnail: NativeCardThumbnail;
  /** Section heading (e.g. "Preview"). */
  label: string;
  /** Caption noting the chrome text is localized at render time. */
  caption: string;
};

/**
 * A live preview of how a native-thumb creative renders in the puzzle result
 * screen's "next puzzles" grid.
 *
 * Mirrors `NativeAdThumb` rather than reusing it, for the same reason
 * `NativeTilePreview` mirrors the tile: the real component needs
 * `GamePreferencesContext` and next-intl, and the admin layout is locale-less
 * and has neither.
 *
 * Boxed to a tile's width rather than filling the sidebar. The whole point of
 * this shape is that the title gets one line before it truncates, and a
 * preview two or three times a tile's width would show copy fitting that will
 * not fit on the page.
 */
export function NativeThumbPreview({ title, thumbnail, label, caption }: Props) {
  return (
    <div>
      <span className="block text-sm font-medium mb-1">{label}</span>
      <div className="w-40 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <CreativeThumbnail
          imagePath={thumbnail.imagePath}
          imageAlt={thumbnail.imageAlt}
          fen={thumbnail.fen}
          className="aspect-square w-full bg-muted"
        />
        <span className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-foreground">
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Ad
          </span>
          <span className="min-w-0 flex-1 truncate">{title || '—'}</span>
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
