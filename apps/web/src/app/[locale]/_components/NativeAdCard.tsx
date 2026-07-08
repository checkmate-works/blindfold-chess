'use client';

import Image from 'next/image';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { NativeAdView } from '@/lib/ads/ad';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  /** The creative to render (title/description/avatar/href), from the DB. */
  creative: NativeAdView;
  locale: string;
  variant?: 'feed' | 'card';
  /** Extra classes for the wrapper (e.g. the feed's row divider), merged with
   * the component-owned `ad-slot-wrapper` so they collapse together. */
  className?: string;
};

/**
 * Native ad card — the same `ActivityCard` shell as the surfaces it blends
 * into (board thumbnail, avatar row, body text) rather than an AdSense `<ins>`
 * slot. Content is admin-managed (`ad_creatives`, any `native_card` slot);
 * only the disclosure label, avatar fallback, and board are chrome. The whole
 * card links to the creative's `href` (an affiliate URL).
 *
 * Shared across every native-card surface:
 * - `variant='feed'` (default) → the home/topics timeline (`FeedClient`).
 * - `variant='card'` → the catalog lists (puzzle / position-memory), where it
 *   matches `CatalogListCard` (also `ActivityCard variant="card"`), so the ad
 *   reads as a list entry minus the like/comment footer.
 *
 * The `.ad-slot-wrapper` hide hook (the `bfc_ads_hidden` no-flash CSS layer of
 * the ad-free entitlement) is owned HERE, on the component's own wrapper — a
 * call site cannot forget it. Surfaces with per-row chrome that must collapse
 * along with the card (the feed's divider) merge it in via `className`.
 *
 * i18n note: the ad-chrome strings still live under the `home.feed.nativeAd`
 * namespace for historical reasons (this card originated in the feed). They are
 * surface-neutral ("Ad" / sponsor / disclosure); a future rename to a neutral
 * namespace is a safe isolated follow-up (only this file references it).
 */
export function NativeAdCard({ creative, locale, variant = 'feed', className }: Props) {
  const t = useTranslations('home.feed.nativeAd');
  const { preferences } = useGamePreferences();

  return (
    <div className={`ad-slot-wrapper${className ? ` ${className}` : ''}`}>
      <ActivityCard
        href={creative.href}
        locale={locale}
        variant={variant}
        thumbnail={
          creative.thumbnail.imagePath ? (
            <Image
              src={creative.thumbnail.imagePath}
              alt={creative.thumbnail.imageAlt ?? ''}
              width={96}
              height={96}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <BoardThumbnail
              fen={creative.thumbnail.fen}
              className="w-full h-full"
              boardTheme={preferences.boardTheme}
            />
          )
        }
        author={
          <div className="flex items-start gap-3">
            {creative.avatarImagePath ? (
              <Image
                src={creative.avatarImagePath}
                alt={creative.avatarAlt}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t('avatarLabel')}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-foreground">{t('sponsorName')}</span>
            </div>
          </div>
        }
        permalink={
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {t('disclosure')}
          </span>
        }
      >
        <p className="text-sm font-medium text-foreground mt-1">{creative.title}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">{creative.description}</p>
      </ActivityCard>
    </div>
  );
}
