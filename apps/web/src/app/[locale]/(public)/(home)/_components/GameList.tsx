import type { NativeTileView } from '@/lib/ads/ad';
import { withRepeatingNativeAds } from '@/lib/ads/placement';
import type { Game } from '@/lib/games/saved-game-types';

import { NativeAdTile } from '@/app/[locale]/_components/NativeAdTile';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameListItem } from './GameListItem';

type Props = {
  games: Game[];
  locale: Locale;
  onDeleteGame: (gameId: string) => void;
  /** Creatives to interleave as rows; empty places none. */
  nativeAdCreatives?: readonly NativeTileView[];
};

export function GameList({ games, locale, onDeleteGame, nativeAdCreatives = [] }: Props) {
  return (
    <div className="bg-card rounded-md border border-border overflow-hidden">
      <ul>
        {withRepeatingNativeAds(
          games.map((game) => (
            <GameListItem key={game.id} game={game} locale={locale} onDelete={onDeleteGame} />
          )),
          nativeAdCreatives,
          // The same divider as `GameListItem`, on the wrapper that the
          // ad-free CSS hide collapses, so a hidden ad takes its line with it.
          (creative, key) => (
            <NativeAdTile
              key={key}
              creative={creative}
              variant="row"
              className="border-b border-border last:border-b-0"
            />
          )
        )}
      </ul>
    </div>
  );
}
