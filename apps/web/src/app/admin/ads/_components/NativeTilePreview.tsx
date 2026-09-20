import type { NativeCardThumbnail } from '@/lib/ads/payload';
import { CreativeThumbnail } from '@/lib/ads/ui/CreativeThumbnail';

type Props = {
  icon: string;
  title: string;
  description: string;
  thumbnail: NativeCardThumbnail;
  /** Section heading (e.g. "Preview"). */
  label: string;
  /** Caption noting the chrome text is localized at render time. */
  caption: string;
};

/**
 * A live preview of how a native-tile creative renders in the practice grid.
 *
 * Mirrors `NativeAdTile` rather than reusing it, for the same reason
 * `NativeCardPreview` mirrors the card: the real component needs
 * `GamePreferencesContext` and next-intl, and the admin layout is locale-less
 * and has neither. The chrome strings and the creative's own copy are shown
 * in English — `en` is the locale every creative must fill in and the one the
 * rest fall back to.
 */
export function NativeTilePreview({ icon, title, description, thumbnail, label, caption }: Props) {
  return (
    <div>
      <span className="block text-sm font-medium mb-1">{label}</span>
      <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
        <div className="flex min-h-7 items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
            Recommended Reading
          </p>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Ad
          </span>
        </div>
        <h3 className="mt-1 text-base font-bold text-foreground">
          <span aria-hidden="true" className="mr-1.5">
            {icon || '—'}
          </span>
          {title || '—'}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          <CreativeThumbnail
            imagePath={thumbnail.imagePath}
            imageAlt={thumbnail.imageAlt}
            fen={thumbnail.fen}
            className="aspect-[2/1] w-full"
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
