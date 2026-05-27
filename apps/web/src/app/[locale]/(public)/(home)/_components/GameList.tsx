import type { Game } from '@/lib/games/saved-game-types';

import type { Locale } from '@/app/[locale]/_lib/types';

import { GameListItem } from './GameListItem';

type Props = {
  games: Game[];
  locale: Locale;
  onDeleteGame: (gameId: string) => void;
};

export function GameList({ games, locale, onDeleteGame }: Props) {
  return (
    <div className="bg-card rounded-md border border-border overflow-hidden">
      <ul>
        {games.map((game) => (
          <GameListItem key={game.id} game={game} locale={locale} onDelete={onDeleteGame} />
        ))}
      </ul>
    </div>
  );
}
