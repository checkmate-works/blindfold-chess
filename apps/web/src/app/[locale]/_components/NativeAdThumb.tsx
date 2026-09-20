'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { NativeThumbView } from '@/lib/ads/ad';
import { CreativeThumbnail } from '@/lib/ads/ui/CreativeThumbnail';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { FOCUS_RING_CLASSES } from '@/app/[locale]/_lib/link-classes';

type Props = {
  /** The creative to render (title/thumbnail/href), from the DB. */
  creative: NativeThumbView;
  /** Extra classes for the wrapper, merged with the component-owned
   * `ad-slot-wrapper` so they collapse together. */
  className?: string;
};

/**
 * Native ad thumb — the `native_thumb` kind's renderer, shaped like the
 * `NextPuzzleCard` tiles it sits among: a square thumbnail with one line of
 * text beneath it, the whole tile a link.
 *
 * The disclosure takes the slot the puzzle tiles give their side-to-move dot,
 * which is what keeps the row one line high. A second line here would make
 * this the one cell in the grid that is taller than the rest, and a grid row
 * is sized by its tallest cell — the section would grow for every reader who
 * sees an ad, including on the layout where it sits directly above the
 * result screen's action buttons.
 *
 * Unlike the puzzle tiles, this one does not defer prefetch on pointer
 * intent: the destination is off-site, so there is nothing for Next to
 * prefetch and no server render to save. It is a plain anchor for the same
 * reason.
 *
 * `rel="sponsored"` per Google's link-attribute guidance, and the disclosure
 * is in the accessible name so a link list reads "Ad: <title>".
 *
 * The `.ad-slot-wrapper` hide hook (the `bfc_ads_hidden` no-flash CSS layer
 * of the ad-free entitlement) is owned here, on the component's own wrapper,
 * exactly as `NativeAdCard` and `NativeAdTile` own theirs — a call site
 * cannot forget it.
 */
export function NativeAdThumb({ creative, className }: Props) {
  const t = useTranslations('nativeAd');
  const { preferences } = useGamePreferences();

  return (
    <div className={`ad-slot-wrapper${className ? ` ${className}` : ''}`}>
      <a
        href={creative.href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={`${t('disclosure')}: ${creative.title}`}
        className={`block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md ${FOCUS_RING_CLASSES}`}
      >
        <CreativeThumbnail
          imagePath={creative.thumbnail.imagePath}
          imageAlt={creative.thumbnail.imageAlt}
          fen={creative.thumbnail.fen}
          boardTheme={preferences.boardTheme}
          className="aspect-square w-full bg-muted"
        />
        <span className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-foreground">
          <span
            aria-hidden="true"
            className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {t('disclosure')}
          </span>
          <span className="min-w-0 flex-1 truncate">{creative.title}</span>
        </span>
      </a>
    </div>
  );
}
