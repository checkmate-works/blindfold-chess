'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Ruy Lopez after 3. Bb5 — a fixed, recognizable opening position chosen so
 * a future opening-book affiliate link (Amazon / Awin) has a natural,
 * on-topic board behind it. Hardcoded rather than derived via
 * `@blindfold-chess/features/chess-core` to keep chess.js out of the client
 * bundle for what is otherwise a static thumbnail (see `BoardThumbnail`'s
 * own rationale).
 */
const RUY_LOPEZ_FEN = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

type Props = {
  locale: string;
  variant?: 'feed' | 'card';
};

/**
 * First pass at a "native" ad card — same `ActivityCard` shell as real feed
 * entries (board thumbnail, avatar row, body text) instead of an AdSense
 * `<ins>` slot. No `href` is set: the affiliate link isn't wired up yet, so
 * the card is intentionally non-clickable for now.
 */
export function NativeAdCard({ locale, variant = 'feed' }: Props) {
  const t = useTranslations('home.feed.nativeAd');
  const { preferences } = useGamePreferences();

  return (
    <ActivityCard
      variant={variant}
      locale={locale}
      thumbnail={
        <BoardThumbnail
          fen={RUY_LOPEZ_FEN}
          className="w-full h-full"
          boardTheme={preferences.boardTheme}
        />
      }
      author={
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-muted-foreground">{t('avatarLabel')}</span>
          </div>
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
      <p className="text-sm font-medium text-foreground mt-1">{t('title')}</p>
      <p className="text-sm text-muted-foreground line-clamp-2">{t('description')}</p>
    </ActivityCard>
  );
}
