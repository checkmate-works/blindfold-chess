'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { NativeTileView } from '@/lib/ads/ad';
import { CreativeThumbnail } from '@/lib/ads/ui/CreativeThumbnail';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  /** The creative to render (icon/title/description/thumbnail), from the DB. */
  creative: NativeTileView;
  /**
   * Which card this creative is blending into, all three drawing the same
   * stored fields the way `NativeAdCard` has a feed and a card variant:
   *
   * - `tile` — the `/practice` grid cell (the default).
   * - `link` — the full-width `CardLink` row the practice result screens use
   *   under "Related Learning".
   * - `iconTile` — the `IconTileCard` of the `/leaderboard` module grid: a
   *   40px icon badge, a title, and one line under it.
   *
   * Each drops whatever its neighbours do not carry. `link` and `iconTile`
   * drop the board thumbnail, and `iconTile` also drops the sponsor line,
   * because its neighbours are two lines high and a grid row is sized by its
   * tallest cell — a third line would grow every row the ad appears in.
   */
  variant?: 'tile' | 'link' | 'iconTile';
  /** Extra classes for the wrapper, merged with the component-owned
   * `ad-slot-wrapper` so they collapse together. */
  className?: string;
};

/**
 * Native ad tile — the `native_tile` kind's renderer, in one of two shapes.
 *
 * `tile` is the `/practice` grid cell: the same rounded, bordered card
 * surface and hover lift as the module tiles beside it, a chrome line above
 * the title, an emoji before it, and the creative's thumbnail where a
 * module's example band goes.
 *
 * `link` is the practice result screens' `CardLink` row — emoji on the left,
 * title and a three-line description beside it, full width.
 *
 * `iconTile` is the `/leaderboard` module grid's `IconTileCard` — a 40px icon
 * badge, a title, and one line under it where the neighbours show the
 * reader's own rank.
 *
 * All three are the same stored fields drawn for a different neighbour, which
 * is what makes them variants rather than kinds: a kind is a field set (which
 * is why `native_thumb` is one, having neither emoji nor description), and
 * these differ only in what they draw.
 *
 * What it does NOT copy from `PracticeMenuCard` is as deliberate as what it
 * does. There are no level dots, because the ad is in no difficulty band and
 * a borrowed one would be a claim about the destination that nobody made.
 * There is no chevron, because that mark means "this opens a page of this
 * site". The disclosure badge takes the corner the rank badge occupies, so
 * the line above the title reads as chrome in both card types.
 *
 * Unlike `NativeAdCard` there is no stretched background anchor: the tiles
 * around it stretch one because their title has to stay a plain heading for
 * the rank badge to be separately clickable, and this tile has nothing to
 * keep clickable. One visible link, carrying the disclosure in its
 * accessible name so a link list reads "Ad: <title>", covers the whole
 * surface through `after:absolute after:inset-0`.
 *
 * `rel="sponsored"` per Google's link-attribute guidance.
 *
 * The `.ad-slot-wrapper` hide hook (the `bfc_ads_hidden` no-flash CSS layer
 * of the ad-free entitlement) is owned here, on the component's own wrapper,
 * exactly as `NativeAdCard` owns its own — a call site cannot forget it.
 */
export function NativeAdTile({ creative, variant = 'tile', className }: Props) {
  const t = useTranslations('nativeAd');
  const { preferences } = useGamePreferences();

  if (variant === 'link') {
    return (
      <div className={`ad-slot-wrapper${className ? ` ${className}` : ''}`}>
        <div className="group relative rounded-md border border-border bg-card p-4 transition-all hover:border-foreground/20 focus-within:border-foreground/20">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="shrink-0 text-2xl">
              {creative.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                  {t('sponsorName')}
                </p>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {t('disclosure')}
                </span>
              </div>
              <h3 className="mb-1 text-base font-medium text-foreground">
                <a
                  href={creative.href}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  aria-label={`${t('disclosure')}: ${creative.title}`}
                  className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {creative.title}
                </a>
              </h3>
              <p className="line-clamp-3 text-sm text-muted-foreground">{creative.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'iconTile') {
    return (
      <div className={`ad-slot-wrapper${className ? ` ${className}` : ''}`}>
        <div className="group relative rounded-lg border border-border bg-card p-4 transition-all hover:border-foreground/20 focus-within:border-foreground/20">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-lg"
            >
              {creative.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate text-sm font-medium text-foreground">
                  <a
                    href={creative.href}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    aria-label={`${t('disclosure')}: ${creative.title}`}
                    className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {creative.title}
                  </a>
                </h3>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {t('disclosure')}
                </span>
              </div>
              {/* The neighbours put the reader's own rank on this line. The ad
                  puts its description there and never a rank — it is in no
                  ranking, and a borrowed one would be a claim about the
                  destination that nobody made. */}
              <p className="truncate text-sm text-muted-foreground">{creative.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`ad-slot-wrapper${className ? ` ${className}` : ''}`}>
      <div className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/30 focus-within:border-primary/30">
        <div className="flex min-h-7 items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
            {t('sponsorName')}
          </p>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {t('disclosure')}
          </span>
        </div>

        <h3 className="mt-1 text-base font-bold text-foreground">
          <span aria-hidden="true" className="mr-1.5">
            {creative.icon}
          </span>
          <a
            href={creative.href}
            target="_blank"
            rel="sponsored noopener noreferrer"
            aria-label={`${t('disclosure')}: ${creative.title}`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {creative.title}
          </a>
        </h3>

        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{creative.description}</p>

        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          <CreativeThumbnail
            imagePath={creative.thumbnail.imagePath}
            imageAlt={creative.thumbnail.imageAlt}
            fen={creative.thumbnail.fen}
            boardTheme={preferences.boardTheme}
            className="aspect-[2/1] w-full"
          />
        </div>
      </div>
    </div>
  );
}
